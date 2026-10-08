// ====== Rich Text Table Script ======
const debug = false; // Enable debug logs
const debugLog = (...args) => { if (debug && console && console.log) console.log(...args); };

// Process all rich text containers for tables.
const tableContainers = document.querySelectorAll('[data-richtable-element="richtext"]');
debugLog("Found table containers:", tableContainers);

// Parse table options from an options row token string.
const parseTableOptions = (text) => {
  text = text.replace(/&nbsp;/g, ' ');
  const options = {};
  const regex = /(\w+):\s*([^,}]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === 'name') {
      options.name = value;
      debugLog("Option - name:", value);
    }
  }
  const colwidthsMatch = text.match(/colwidths:\s*([^}]+)/);
  if (colwidthsMatch) {
    const parts = colwidthsMatch[1]
      .split(',')
      .map(s => s.replace(/&nbsp;/g, ' ').trim())
      .filter(Boolean);
    options.colwidths = parts.map(fracStr => {
      const fracParts = fracStr.split('/');
      if (fracParts.length === 2) {
        const num = parseFloat(fracParts[0]);
        const den = parseFloat(fracParts[1]);
        if (den !== 0) return num / den;
      }
      return 1;
    });
    debugLog("Option - colwidths:", options.colwidths);
  }
  return options;
};

// Get the inner HTML from a paragraph; unwrap a single child if its text is delimited.
const getRowHTML = paragraph => {
  let rowHTML = paragraph.innerHTML.trim();
  if (paragraph.childElementCount === 1) {
    const child = paragraph.firstElementChild;
    const childText = (child.innerText || child.textContent).trim();
    if (childText.startsWith('||') && childText.endsWith('||')) {
      rowHTML = child.innerHTML.trim();
    }
  }
  return rowHTML;
};

// Parse tokens from a cell's HTML string.
const parseCellContent = originalHTML => {
  const cleanHTML = originalHTML.replace(/&nbsp;/g, ' ');
  let cellTag = 'td', rowspan = null, colspan = null, ratio = null, className = null;
  let displayHTML = cleanHTML;
  const tokenPattern = /\{\{([^}]+)\}\}/g;
  let match;
  while ((match = tokenPattern.exec(cleanHTML)) !== null) {
    const tokenContent = match[1].trim();
    const tokens = tokenContent.split(',').map(s => s.trim());
    tokens.forEach(token => {
      const parts = token.split(':').map(s => s.trim());
      if (parts.length === 2) {
        const key = parts[0].toLowerCase();
        const value = parts[1];
        if (key === 'tag' && value === 'th') {
          cellTag = 'th';
        } else if (key === 'rowspan') {
          rowspan = value;
        } else if (key === 'colspan') {
          colspan = value;
        } else if (key === 'ratio') {
          const fracParts = value.split('/');
          if (fracParts.length === 2) {
            const num = parseFloat(fracParts[0]);
            const den = parseFloat(fracParts[1]);
            if (den !== 0) ratio = num / den;
          }
        } else if (key === 'class') {
          className = value;
        }
      }
    });
    displayHTML = displayHTML.replace(match[0], '');
  }
  return { cellTag, html: displayHTML.trim(), rowspan, colspan, ratio, className };
};

// Build a table from an array of double pipe-delimited row strings.
const buildTableFromRows = (rows) => {
  let options = {};
  // Check if the first row is an options row.
  if (rows.length > 0) {
    let firstRowContent = rows[0];
    if (firstRowContent.startsWith('||')) firstRowContent = firstRowContent.substring(2);
    if (firstRowContent.endsWith('||')) firstRowContent = firstRowContent.substring(0, firstRowContent.length - 2);
    const cleaned = firstRowContent.replace(/\{\{[^}]+\}\}/g, '').trim();
    if (cleaned === '') {
      const tokenMatch = firstRowContent.match(/\{\{([^}]+)\}\}/);
      if (tokenMatch) options = parseTableOptions(tokenMatch[1]);
      rows = rows.slice(1);
      debugLog("Options row detected and removed:", options);
    }
  }

  const table = document.createElement('table');
  const headerRatios = [];

  rows.forEach((row, r) => {
    const tr = document.createElement('tr');
    let trimmed = row;
    if (trimmed.startsWith('||')) trimmed = trimmed.substring(2);
    if (trimmed.endsWith('||')) trimmed = trimmed.substring(0, trimmed.length - 2);
    // Split by double pipes.
    const cells = trimmed.split('||').map(cell => cell.trim());
    cells.forEach((cellContent, c) => {
      let cellData = parseCellContent(cellContent);
      // For the first content row, default cells to header cells.
      if (r === 0 && cellData.cellTag === 'td') cellData.cellTag = 'th';
      const cell = document.createElement(cellData.cellTag);
      cell.innerHTML = cellData.html;
      if (cellData.rowspan) cell.setAttribute('rowspan', cellData.rowspan);
      if (cellData.colspan) cell.setAttribute('colspan', cellData.colspan);
      if (cellData.className) cell.className = cellData.className;
      if (r === 0 && cellData.ratio !== null) {
        cell.setAttribute('data-ratio', cellData.ratio);
        headerRatios.push(cellData.ratio);
      }
      tr.appendChild(cell);
    });
    table.appendChild(tr);
  });

  let ratiosToUse = [];
  if (options.colwidths) {
    const headerCount = table.rows[0] ? table.rows[0].cells.length : 0;
    ratiosToUse = options.colwidths.slice();
    while (ratiosToUse.length < headerCount) ratiosToUse.push(1);
  } else if (headerRatios.length === (table.rows[0] ? table.rows[0].cells.length : 0) && headerRatios.length > 0) {
    ratiosToUse = headerRatios;
  } else {
    const headerCount = table.rows[0] ? table.rows[0].cells.length : 0;
    ratiosToUse = Array(headerCount).fill(1);
  }

  const total = ratiosToUse.reduce((sum, r) => sum + r, 0);
  const colgroup = document.createElement('colgroup');
  ratiosToUse.forEach(r => {
    const col = document.createElement('col');
    col.style.width = `${(r / total) * 100}%`;
    colgroup.appendChild(col);
  });
  table.insertBefore(colgroup, table.firstChild);
  if (options.name) table.setAttribute('data-table-name', options.name);
  debugLog("Built table with options:", options, "and column ratios:", ratiosToUse);
  return table;
};

// Process each table container.
tableContainers.forEach(container => {
  const replaceContent = container.getAttribute("data-richtable-replacecontent") !== "false";
  debugLog("Processing table container:", container, "replaceContent:", replaceContent);
  if (replaceContent) {
    const childNodes = Array.from(container.childNodes);
    let tableRows = [];
    const newContent = [];
    const flushTable = () => {
      if (tableRows.length > 0) {
        const table = buildTableFromRows(tableRows);
        newContent.push(table);
        tableRows = [];
      }
    };
    childNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') {
        const txt = (node.innerText || node.textContent).trim();
        if (txt.startsWith('||') && txt.endsWith('||')) {
          const rowHTML = getRowHTML(node);
          tableRows.push(rowHTML);
          debugLog("Added table row:", rowHTML);
          return;
        }
      }
      flushTable();
      newContent.push(node);
    });
    flushTable();
    container.innerHTML = '';
    newContent.forEach(el => container.appendChild(el));
    debugLog("Replaced table container content.");
  } else {
    const childNodes = Array.from(container.childNodes);
    let group = [];
    childNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'P') {
        const nodeText = (node.innerText || node.textContent).trim();
        if (nodeText.startsWith('||') && nodeText.endsWith('||')) {
          group.push(node);
          return;
        }
      }
      if (group.length > 0) {
        const rows = group.map(n => getRowHTML(n));
        const table = buildTableFromRows(rows);
        group[group.length - 1].parentNode.insertBefore(table, group[group.length - 1].nextSibling);
        debugLog("Inserted table after group.");
        group = [];
      }
    });
    if (group.length > 0) {
      const rows = group.map(n => getRowHTML(n));
      const table = buildTableFromRows(rows);
      group[group.length - 1].parentNode.insertBefore(table, group[group.length - 1].nextSibling);
      debugLog("Inserted table after final group.");
    }
  }
});