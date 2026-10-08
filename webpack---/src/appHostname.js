// Regex to match cloud dev box hostnames: [subdomain]-cde-[devbox].[region].wistia.io
export const REGEX_CLOUD_DEV_BOX = /([a-z0-9-]+)-cde-([a-z0-9-]+)\.([a-z0-9-]+)\.wistia\.io/i;
// Regex to match openclaw containerized dev box hostnames: [subdomain]-cde-[devbox].[region].claw.wistia.io
export const REGEX_OPENCLAW_DEV_BOX =
  /([a-z0-9-]+)-cde-([a-z0-9-]+)\.([a-z0-9-]+)\.claw\.wistia\.io/i;
export const REGEX_WIZARD_DEV_BOX = /([a-z0-9-]+)-cde-([a-z0-9-]+)\.([a-z0-9-]+)\.wiz\.wistia\.io/i;
export const REGEX_CDB_STAGING_DEV_BOX =
  /([a-z0-9-]+)-cde-([a-z0-9-]+)\.([a-z0-9-]+)\.cdb-staging\.wistia\.io/i;
export const REGEX_DEV_METAL_TUNNEL =
  /([a-z0-9-]+)-txl-([a-z0-9-]+)\.([a-z0-9-]+)\.mtl\.wistia\.io/i;

export const HOST_MODE_META_NAME = 'wistia-host-mode';
export const HOST_MODE_PRODUCTION = 'production';

export const isProductionHostMode = () => {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
    return false;
  }
  try {
    const meta = document.querySelector(`meta[name="${HOST_MODE_META_NAME}"]`);
    const content = meta?.getAttribute('content');
    return typeof content === 'string' && content.trim().toLowerCase() === HOST_MODE_PRODUCTION;
  } catch {
    return false;
  }
};

export const appHostname = (subdomain = 'app') => {
  const hostname = process.env.BASE_HOSTNAME || process.env.HOSTNAME;
  const subdomainSuffixHostname = getSubdomainSuffixHostname(subdomain);
  if (subdomainSuffixHostname) {
    return subdomainSuffixHostname;
  }

  return `${subdomain}.${hostname}`;
};

export const getSubdomainSuffixHostname = (subdomain = 'app') => {
  if (isProductionHostMode()) {
    return null;
  }

  // Check if we're running in a cloud dev environment by parsing the current hostname
  if (typeof window !== 'undefined' && window.location) {
    const currentHost = window.location.hostname;

    // If we're already on a cloud dev box, extract the devbox and region
    const cdbStagingDevBoxMatches = REGEX_CDB_STAGING_DEV_BOX.exec(currentHost);
    if (cdbStagingDevBoxMatches) {
      return `${subdomain}-cde-${cdbStagingDevBoxMatches[2]}.${cdbStagingDevBoxMatches[3]}.cdb-staging.wistia.io`;
    }
    const cloudDevBoxMatches = REGEX_CLOUD_DEV_BOX.exec(currentHost);
    if (cloudDevBoxMatches) {
      // Return the new hostname with the same devbox and region
      return `${subdomain}-cde-${cloudDevBoxMatches[2]}.${cloudDevBoxMatches[3]}.wistia.io`;
    }
    const openclawDevBoxMatches = REGEX_OPENCLAW_DEV_BOX.exec(currentHost);
    if (openclawDevBoxMatches) {
      return `${subdomain}-cde-${openclawDevBoxMatches[2]}.${openclawDevBoxMatches[3]}.claw.wistia.io`;
    }
    const wizardDevBoxMatches = REGEX_WIZARD_DEV_BOX.exec(currentHost);
    if (wizardDevBoxMatches) {
      return `${subdomain}-cde-${wizardDevBoxMatches[2]}.${wizardDevBoxMatches[3]}.wiz.wistia.io`;
    }
    const metalTunnelMatches = REGEX_DEV_METAL_TUNNEL.exec(currentHost);
    if (metalTunnelMatches) {
      // Return the new hostname with the same tunnel subdomain suffix and region
      return `${subdomain}-txl-${metalTunnelMatches[2]}.${metalTunnelMatches[3]}.mtl.wistia.io`;
    }
  }
  return null;
};
