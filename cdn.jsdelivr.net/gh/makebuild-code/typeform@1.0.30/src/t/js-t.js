// JS Tracking Helper
(function trackingCLientHelperScope() {
  const viewPagePropsMapping = [
    {
      isMatch: () => window.title === "Not Found",
      props: {
        typeform_property: "404_pages",
        section: "public_site_not_found",
      },
    },
    {
      isMatch: () => window.location.pathname.startsWith("/try"),
      props: {
        typeform_property: "landing_page",
      },
    },
    {
      isMatch: () => window.location.pathname.startsWith("/blog"),
      props: {
        typeform_property: "blog",
      },
    },
    {
      isMatch: () => window.location.pathname === "/connect",
      props: {
        typeform_property: "typeform_connect",
        section: "typeform_connect_home",
      },
    },
    {
      isMatch: () => window.location.pathname.startsWith("/connect-category"),
      props: {
        typeform_property: "typeform_connect",
        section: "typeform_connect_category_page",
      },
    },
    {
      isMatch: () => {
        const [_, path] = window.location.pathname.split("/");
        return path === "connect-integration";
      },
      props: () => {
        const integrationSlug = window.location.pathname.split("/")[2];
        return {
          typeform_property: "typeform_connect",
          section: "typeform_connect_integration_page",
          typeform_connect_integration: integrationSlug,
        };
      },
    },
    {
      isMatch: () => {
        const [_, path, appSlug] = window.location.pathname.split("/");
        return path === "connect" && appSlug && appSlug !== "category";
      },
      props: () => {
        const appSlug = window.location.pathname.split("/")[2];
        return {
          typeform_property: "typeform_connect",
          section: "typeform_connect_app_page",
          typeform_connect_app: appSlug,
        };
      },
    },
    {
      isMatch: () => {
        const path = window.location.pathname;
        return path === "/templates" || // exact match for landing page
               path.startsWith("/templates/") ||
               path.startsWith("/templates-category/") ||
               path.startsWith("/templates-sub-category/");
      },
      props: {
        typeform_property: "public_template_gallery",
      },
    },
  ];

  function createTrackingHelper() {
    let _viewPageProps = {};

    const getViewPageProps = () => {
      const { props } =
        viewPagePropsMapping.find(({ isMatch }) => isMatch()) || {};
      const matchedProps = props
        ? typeof props === "function"
          ? props()
          : props
        : {};
      return {
        typeform_property: "public_site",
        ..._viewPageProps,
        ...matchedProps,
      };
    };

    const log = (...args) => {
      window.__DEBUG_TRACKING__ && console.trace(...args);
    };

    return {
      getViewPageProps: getViewPageProps,
      setPageTrackingProps: (props) => {
        _viewPageProps = {
          ..._viewPageProps,
          ...props,
        };
      },
      snakeCase: (value) => {
        const words =
          value
            // between lower & upper
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            // between number & letter
            .replace(/(\d)([A-Za-z])/g, "$1 $2")
            .replace(/([A-Za-z])(\d)/g, "$1 $2")
            // before last upper in a sequence followed by lower
            .replace(/\b([A-Z]+)([A-Z])([a-z])/, "$1 $2$3")
            .match(/[A-Za-z0-9]+/g) ?? [];

        return words.map((value) => value.toLowerCase()).join("_");
      },
      getTypeformVersion: () => {
        return isMobile.any ? "mobile" : "v2";
      },
      getPage: () => {
        return window.location.origin + window.location.pathname;
      },
      getMandatoryProperties: () => {
        const viewPageProps = getViewPageProps();
        return {
          category: "public_site",
          typeform_version: window.trackingHelper.getTypeformVersion(),
          unique_pageview_id: uuidv4(),
          unique_sectionview_id: uuidv4(),
          attribution_user_id: window.getAttributionUserId(),
          page: window.trackingHelper.getPage(),
          tracking_session_id: Cookies.get("tracking_session_id"),
          event_owner: "site_team",
          ...viewPageProps,
          // country: {countryCode},
        };
      },
      trackViewPageSection: (data) => {
        const props = {
          page: window.location.href,
          title: document.title,
          ...window.trackingHelper.getMandatoryProperties(),
          ...(data || {}),
        };

        trackingClient.trackViewPageSection(props);

        log("view_page_section", props);
      },
      trackEvent: (eventName, data) => {
        const props = {
          ...window.trackingHelper.getMandatoryProperties(),
          ...data,
        };

        trackingClient.sendEvent(eventName, props);

        log(eventName, props);
      },
      trackItemClicked: (trackingData) => {
        const { link_url: rawLinkUrl } = trackingData;
        const link_url = rawLinkUrl
          ? rawLinkUrl.replace(window.location.origin, "")
          : undefined;

        const props = {
          ...window.trackingHelper.getMandatoryProperties(),
          ...trackingData,
          link_url,
        };

        trackingClient.trackItemClicked(props);
        log("item_clicked", props);
      },
      trackMessageShown: (trackingData) => {
        const props = {
          ...window.trackingHelper.getMandatoryProperties(),
          ...trackingData,
        };

        trackingClient.trackMessageShown(props);
        log("message_shown", props);
      },
      trackTmpItemClicked: (item, props) => {
        const trackingProps = {
          ...window.trackingHelper.getMandatoryProperties(),
          item,
          test_id: "all",
          ...props,
        };
        trackingClient.trackTmpItemClicked(trackingProps);
        log("tmp_item_clicked", props);
      },
      trackLogin: (url, label, location = "", itemType = "link") => {
        window.trackingHelper.trackItemClicked({
          item: "login",
          item_type: itemType,
          link_url: url,
          label: window.trackingHelper.snakeCase(label),
          product: "typeform",
          ...(location && { location }),
        });
      },
      trackSignup: (url, label, location = "", itemType = "link") => {
        window.trackingHelper.trackItemClicked({
          item: "sign_up",
          item_type: itemType,
          link_url: url,
          label: window.trackingHelper.snakeCase(label),
          product: "typeform",
          ...(location && { location }),
        });
      },
      trackContactSales: (url, label, location = "", itemType = "button") => {
        window.trackingHelper.trackItemClicked({
          item: "contact_sales",
          item_type: itemType,
          link_url: url,
          label: window.trackingHelper.snakeCase(label),
          pricing_version: "3.1",
          ...(location && { location }),
        });
      },
      trackPageNavigated: (props) => {
        const documentHeight = document.body.offsetHeight - window.innerHeight;
        const scrollPercentage = window.scrollY / documentHeight;

        window.trackingHelper.trackEvent("page_navigated", {
          item: "scroll",
          ...props,
          location_depth: scrollPercentage,
        });
      },
      trackExperimentViewed: (props) => {
        const state = window.optimizely?.get('state');
        if (!state) {
          return;
        }

        const activeExperiments = state.getActiveExperimentIds();
        const userContext = window.optimizely?.get('visitor');
        
        // Track an event for each active experiment
        activeExperiments.forEach(experimentId => {
          const experiment = state.getExperimentStates()[experimentId];
          if (experiment) {
            // Get active campaign states
            const campaignStates = window.optimizely.get('state').getCampaignStates({ isActive: true });
            
            // Find the campaign that contains our experiment
            const campaign = Object.values(campaignStates).find(c => 
              c.experiment && c.experiment.id === experimentId
            );
            
            if (campaign && !campaign.isInCampaignHoldback) {
              const eventData = {
                experiment_id: experimentId,
                experiment_name: campaign.experiment.name,
                variation_id: campaign.variation.id,
                variation_name: campaign.variation.name,
                optimizely_user_id_fingerprint: window.optimizely?.get('visitor')?.visitorId
              };
              
              window.trackingHelper.trackEvent("experiment_viewed", eventData);
            }
          }
        });
      },
      trackSearchQueryEntered: (data) => {
        const props = {
          ...window.trackingHelper.getMandatoryProperties(),
          ...data,
        };

        trackingClient.trackSearchQueryEntered(props);
        log("search_query_entered", props);
      },
    };
  }

  window.trackingHelper = createTrackingHelper();

  window.dispatchEvent(new Event("tracking-helper:loaded"));
})();

// Init JS Tracking
(function jsTrackingInitScope() {
  let hasPageTracked = false;
  let hasTrackingInitialized = false;

  // The backend pageview covers visitors without performance consent, where
  // Segment never initializes and no view_page_section is sent. It must not
  // fire for visitors who DO have performance consent, or the pageview is
  // counted twice.
  //
  // OneTrust publishes consent in phases. Traced on a cold US load:
  //
  //   t=978   OnetrustActiveGroups undefined, no OptanonConsent cookie
  //   t=3308  OnetrustActiveGroups ",,"          <- resolves to NO consent
  //   t=4422  OnetrustActiveGroups ",1,2,3,4,"   <- auto-grant lands
  //
  // For ~1.1s the group list exists but is empty, so hasPerformanceConsent()
  // reports false for a visitor who is about to have it. Deciding in that
  // window sends the backend pageview and latches hasPageTracked; Segment
  // then initializes on the next phase and sends view_page_section too.
  //
  // Note the eager initTracking() call below cannot simply be dropped to
  // avoid this. js-t.js is injected as type="cc-ext-hosted-script" and only
  // executes when the consent extension activates it at DOMContentLoaded.
  // When OneTrust resolves first (measured: events at 556ms and 816ms,
  // js-t.js active at 817ms) the listener is registered too late to ever
  // receive one, and without the eager call tracking never initializes at
  // all. So keep the eager call and make the pageview decision wait instead.
  const CONSENT_POLL_MS = 100;
  const CONSENT_TIMEOUT_MS = 5000;
  let backendPageviewScheduled = false;

  function isConsentResolved() {
    // Returning visitor: their stored choice is already readable.
    if (consentUtil.hasConsentCookie()) return true;

    const groups = window.OnetrustActiveGroups;
    return typeof groups === "string" && groups.replace(/,/g, "") !== "";
  }

  function sendBackendPageview() {
    if (hasPageTracked) return;

    // Re-read rather than trusting the pass that scheduled this: that is the
    // whole point of waiting.
    if (consentUtil.hasPerformanceConsent()) return;

    hasPageTracked = true;
    const viewPageProps = window.trackingHelper.getViewPageProps();

    fetch("https://www.typeform.com/api/v2/track/page/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        typeformProperty:
          (viewPageProps && viewPageProps.typeform_property) || "public_site",
        title: document.title,
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        typeformVersion: window.trackingHelper.getTypeformVersion(),
        attributionUserId: window.getAttributionUserId(),
        locale: navigator.language,
      }),
    }).catch(() => {});
  }

  function scheduleBackendPageview() {
    if (backendPageviewScheduled) return;
    backendPageviewScheduled = true;

    // The timeout covers OneTrust being blocked outright: the group list
    // never appears, and that visitor genuinely has no consent.
    const deadline = Date.now() + CONSENT_TIMEOUT_MS;

    (function waitForConsent() {
      if (hasPageTracked) return;

      if (isConsentResolved() || Date.now() >= deadline) {
        sendBackendPageview();
        return;
      }

      setTimeout(waitForConsent, CONSENT_POLL_MS);
    })();
  }
  function initTracking() {
    // Now you can run following consentUtil check the exact consent.
    // Script tags above adds consentUtil helper to global window

    // TargetingConsent
    const hasTargetingConsent = consentUtil.hasTargetingConsent();

    // FunctionalConsent
    const hasFunctionalConsent = consentUtil.hasFunctionalConsent();

    // Performance Consent
    const hasPerformanceConsent = consentUtil.hasPerformanceConsent();

    const canInitializeTracking = hasPerformanceConsent;

    if (hasTargetingConsent && !document.getElementById("clearbit")) {
      const clearbitScript = document.createElement("script");
      clearbitScript.id = "clearbit";
      clearbitScript.innerHTML = `!function(w){var clearbit=w.clearbit=w.clearbit||[];if(!clearbit.initialize)if(clearbit.invoked)w.console&&console.error&&console.error("Clearbit snippet included twice.");else{clearbit.invoked=!0;clearbit.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","page","once","off","on"];clearbit.factory=function(t){return function(){var e=Array.prototype.slice.call(arguments);e.unshift(t);clearbit?.push?.(e);return clearbit}};for(var t=0;t<clearbit.methods.length;t++){var e=clearbit.methods[t];clearbit[e]=clearbit.factory(e)}clearbit.load=function(t){var e=document.createElement("script");e.async=!0;e.src=("https:"===document.location.protocol?"https://":"http://")+"x.clearbitjs.com/v1/"+t+"/clearbit.js";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(e,n)};clearbit.SNIPPET_VERSION="3.1.0"; clearbit.load("pk_76b17f79dd398468af3f36d637ba1002"); clearbit.page(); }}(window);`;

      document.body.appendChild(clearbitScript);
    }

    if (!canInitializeTracking) {
      scheduleBackendPageview();
    }

    // For eg. initialize tracking when we have functional consent
    if (
      canInitializeTracking &&
      !trackingClient.isInitialized("segment") &&
      !hasTrackingInitialized
    ) {
      attributionUtil.default.generateUser(
        ".typeform.com",
        window.getAttributionUserId()
      );
      
      // Determine which Segment key to use based on hostname
      const isDevelopment = window.location.hostname === 'www.web-team.tfdev.typeform.com';
      const segmentKey = isDevelopment
        ? 'N4DrQC6NYcQXbJZo6iAU2QLSymJGMQkI'  // Segment Dev key
        : '13PRPoCAmemn6i0qZSq8pnKYbRZ57rTB';  // Segment Prod Key

      trackingClient.default.init(
        segmentKey,
        trackingHelper.getMandatoryProperties(),
        {
          integrations: {
            All: true,
          },
        },
        "GTM-WH2ZQ3X" // GTM_ID
      );

      if (!window.analytics) return;

      // Segment source middleware: stitch the $impression event's anonymousId
      // to our own attribution_user_id cookie so Amplitude's device_id lines
      // up with the rest of the user's stitched journey. See:
      // https://www.twilio.com/docs/segment/connections/sources/catalog/libraries/website/javascript/middleware
      if (
        typeof window.analytics.addSourceMiddleware === "function" &&
        !window.__segmentImpressionMiddlewareRegistered
      ) {
        window.analytics.addSourceMiddleware(({ payload, next }) => {
          const event = payload.obj;
          const attributionId = window.getAttributionUserId
            ? window.getAttributionUserId()
            : null;

          if (
            event?.type === "track" &&
            event?.event === "$impression" &&
            attributionId
          ) {
            event.anonymousId = attributionId;
          }

          next(payload);
        });

        window.__segmentImpressionMiddlewareRegistered = true;
        window.dispatchEvent(new Event("segment-impression-middleware:ready"));
      }

      window.analytics.ready(() => {
        hasTrackingInitialized = true;
        window.trackingHelper.trackViewPageSection();

        // Function to track active experiments
        const trackActiveExperiments = () => {
          const state = window.optimizely?.get('state');
          const activeExperiments = state?.getActiveExperimentIds() || [];
          
          if (activeExperiments.length > 0) {
            const campaignStates = state.getCampaignStates({ isActive: true });
            
            activeExperiments.forEach(experimentId => {
              const campaign = Object.values(campaignStates).find(c => 
                c.experiment && c.experiment.id === experimentId
              );
              
              if (campaign && !campaign.isInCampaignHoldback) {
                const eventData = {
                  experiment_id: experimentId,
                  experiment_name: campaign.experiment.name,
                  variation_id: campaign.variation.id,
                  variation_name: campaign.variation.name,
                  optimizely_user_id_fingerprint: window.optimizely?.get('visitor')?.visitorId
                };
                
                window.trackingHelper.trackEvent("experiment_viewed", eventData);
              }
            });
          }
        };

        // Add Optimizely initialization check and tracking
        if (window.optimizely) {
          // Track any already-active experiments
          trackActiveExperiments();

          // Add listener for future activations
          window.optimizely.push({
            type: "addListener",
            handler: function(event) {
              if (event.type === 'lifecycle' && 
                  (event.name === 'activateDeferredDone' || event.name === 'activated')) {
                trackActiveExperiments();
              }
            }
          });
        }

        if (window.reveal) {
          const { company } = window.reveal;

          if (company) {
            // Override default encoder
            const cookies = Cookies.withConverter({
              write: (value = {}) => JSON.stringify(value),
            });

            cookies.set(
              "clearbit-reveal",
              {
                employees: company.metrics.employees,
              },
              {
                domain: ".typeform.com",
              }
            );
          }
        }
      });
    }
  }

  function handleRejectCookies() {
    window.cookiesUtil.deleteAllNonStrictlyNecessaryCookies();

    // Cello attribution library sets all of its cookies twice for both .typeform.com and www.typeform.com domain
    // .typeform.com cookies can be deleted via js-tracking util but not www.typeform.com domain cookies.
    // Therefore, we need to delete cello related cookies our selves without touching other ones.
    // We have raised the issue to Cello and we will clean this code when they fix this issue on their side
    const allLeftOverCookies = Object.keys(Cookies.get());
    const celloCookies = allLeftOverCookies.filter((cookie) =>
      cookie.includes("cello-")
    );

    celloCookies.forEach((celloCookie) => {
      Cookies.remove(celloCookie);
    });
  }

  window.addEventListener("OneTrustGroupsUpdated", initTracking);
  window.addEventListener("oneTrustCookiesRejected", handleRejectCookies);
  initTracking();
})();

// Tracking With Attributes Helper
(function initTrackingWithAttributesHelper() {
  // cc-t- prefixed attributes are used to for custom properties while tracking events
  function getTrackingAttributes(element) {
    const attributes = Array.from(element.attributes).reduce((acc, attr) => {
      if (attr.name.startsWith("cc-t-")) {
        // Skip utility attributes
        if (attr.name.startsWith("cc-t-utility-")) {
          return acc;
        }
        acc[attr.name.replace("cc-t-", "")] = attr.value;
      }
      return acc;
    }, {});

    // Only look for parent section if this is an item_clicked event or has event tracking
    if (!attributes.location && (attributes.item || attributes.event)) {
      const parentSection = element.closest('section[id]');
      if (parentSection && parentSection.id) {
        attributes.location = parentSection.id;
      }
    }

    return attributes;
  }

  window.trackElementWithAttributes = function trackElementWithAttributes(
    element
  ) {
    const {
      event,
      in_view,
      in_view_allow_multipe,
      "global-skip": globalSkip,
      ...trackingData
    } = getTrackingAttributes(element);

    if (event === "item_clicked") {
      if (!trackingData.item) {
        console.warn("Item attribute is required for tracking");
        return;
      }

      window.trackingHelper.trackItemClicked({
        ...trackingData,
        link_url: trackingData.link || element.href,
        item_type: trackingData.item_type || "link",
        label:
          element.getAttribute("cc-t-utility-snake_case") === "off"
            ? trackingData.label || element.textContent || ""
            : window.trackingHelper.snakeCase(
                trackingData.label || element.textContent || ""
              ),
      });

      return;
    }

    if (in_view === "true" && !event) {
      window.trackingHelper.trackPageNavigated(trackingData);
      return;
    }

    if (!event) {
      return;
    }

    window.trackingHelper.trackEvent(event, trackingData);
  };

  // cc-t-in_view attribute is used to track when an element is in view
  const inViewElements = document.querySelectorAll("[cc-t-in_view]");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const delay = entry.target.getAttribute("cc-t-in_view_delay");

          // If delay attribute exists, wait before tracking
          if (delay) {
            const timeoutId = setTimeout(() => {
              // Only track if element is still in view after delay
              if (entry.target.getAttribute("data-in-view") === "true") {
                window.trackElementWithAttributes(entry.target);

                // Get the attribute value, default to "false" if not present
                const allowMultiple = entry.target.getAttribute("cc-t-in_view_allow_multipe") === "true";
                if (!allowMultiple) {
                  observer.unobserve(entry.target);
                }
              }
            }, parseFloat(delay) * 1000);

            // Store timeout ID to clear if element leaves view
            entry.target.setAttribute("data-timeout-id", timeoutId);
            entry.target.setAttribute("data-in-view", "true");
          } else {
            // Original behavior for elements without delay
            window.trackElementWithAttributes(entry.target);

            // Get the attribute value, default to "false" if not present
            const allowMultiple = entry.target.getAttribute("cc-t-in_view_allow_multipe") === "true";
            if (!allowMultiple) {
              observer.unobserve(entry.target);
            }
          }
        } else {
          // Clear timeout and in-view state when element leaves viewport
          const timeoutId = entry.target.getAttribute("data-timeout-id");
          if (timeoutId) {
            clearTimeout(parseInt(timeoutId));
            entry.target.removeAttribute("data-timeout-id");
          }
          entry.target.setAttribute("data-in-view", "false");
        }
      });
    },
    {
      threshold: 0,
      rootMargin: "0px",
    }
  );

  inViewElements.forEach((element) => {
    observer.observe(element);
  });
})();

// Global Link Interceptor
(function linkInterceptorScope() {
  const HOSTNAMES_ALLOWLIST = ["typeform.com"];
  const HOSTNAMES_BLOCKLIST = ["auth.typeform.com"];

  const SEARCH_PARAMS_ALLOWLIST = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "tf_source",
    "tf_medium",
    "tf_campaign",
    "tf_term",
    "tf_content",
    "referrer",
    "redirect_uri",
    "dev",
    "gspk",
    "gsxid",
    window.ATTRIBUTION_ID_GLOBAL_KEY,
  ];
  const listenersMap = new Map();

  const getCurrentSearchParams = () => {
    const currentUrl = new URL(window.location.href);
    const entries = [...currentUrl.searchParams.entries()];

    return entries.filter(([key]) => {
      return SEARCH_PARAMS_ALLOWLIST.includes(key);
    });
  };

  const isAllowedHostname = (hostname = "") => {
    const isBlocked = HOSTNAMES_BLOCKLIST.some((hn) => hn === hostname);
    if (isBlocked) {
      return false;
    }

    return HOSTNAMES_ALLOWLIST.some((hn) => hostname.endsWith(hn));
  };
  const hasKeyPressed = (event) => {
    return ["ctrlKey", "shiftKey", "altKey", "metaKey"].some(
      (key) => event[key] === true
    );
  };
  const handleLinkClick = (link) => (event) => {
    const linkHref = link.href;
    const linkHrefAttribute = link.getAttribute("href");
    const linkText = link.innerText;
    const targetHref = event?.target?.href;
    const linkTarget = link?.target;
    const targetTarget = event?.target?.target;
    const href = linkHref || targetHref;
    const anchorTarget = linkTarget || targetTarget;

    // Check both self and parent for skip attribute
    const shouldSkipGlobal =
      link.getAttribute("cc-t-global-skip") === "self" ||
      link.closest('[cc-t-global-skip="children"]') !== null;

    // Only run global helper tracking if neither skip condition is met
    if (!shouldSkipGlobal) {
      // login tracking (excluding logout)
      if (
        linkHref &&
        linkHref.includes("login") &&
        !linkHref.includes("login/logout")
      ) {
        const location = link.getAttribute("cc-t-location") || "";
        const itemType = link.getAttribute("cc-t-item_type") || "link";
        window.trackingHelper.trackLogin(linkHref, linkText || "", location, itemType);
      }

      // signup tracking
      const getSignupUrls = () => {
        const domains = [
          'www.typeform.com',
          'www.web-team.tfdev.typeform.com',
          'admin.typeform.com'
        ];
        
        return domains.flatMap(domain => [
          `https://${domain}/signup/`,
          `https://${domain}/signup`,
          `https://${domain}/signup-email/`,
          `https://${domain}/signup-email`
        ]).concat(['/signup/', '/signup', '/signup-email/', '/signup-email']); // Include relative paths
      };

      const signupUrls = getSignupUrls();
      if (linkHref) {
        try {
          const url = new URL(linkHref);
          const matchesSignup = signupUrls.some(signupUrl => {
            // Handle relative paths
            if (signupUrl.startsWith('/')) {
              return url.pathname === signupUrl || url.pathname === signupUrl.slice(0, -1);
            }
            // Handle absolute URLs
            return url.origin + url.pathname === signupUrl || url.origin + url.pathname === signupUrl.slice(0, -1);
          });

          if (matchesSignup) {
            const location = link.getAttribute("cc-t-location") || "";
            const itemType = link.getAttribute("cc-t-item_type") || "link";
            window.trackingHelper.trackSignup(linkHref, linkText || "", location, itemType);
          }
        } catch (e) {
          // Handle invalid URLs silently
          //console.debug('Invalid URL in signup tracking:', e);
        }
      }

      // contactSales tracking
      if (linkHref && linkHref.includes("tfsales.typeform.com/to/PxcVKQGb")) {
        const location = link.getAttribute("cc-t-location") || "";
        const itemType = link.getAttribute("cc-t-item_type") || "button";
        window.trackingHelper.trackContactSales(linkHref, linkText || "", location, itemType);
      }
    }

    // Always run attribute-specific tracking
    window.trackElementWithAttributes(link);

    if (link.nodeName === "BUTTON") {
      return;
    }

    // If the user had pressed a key when they click on a link then we'll use native link behaviour
    if (hasKeyPressed(event)) {
      return;
    }

    try {
      // Links without an href attribute
      if (!linkHref) {
        return;
      }

      // If the link is to an anchor on the same page, then we'll use native link behaviour
      if (linkHref.startsWith("#") || linkHrefAttribute.startsWith("#")) {
        return;
      }

      const destinationUrl = new URL(href);

      // If the link goes outside of typeform.com then we'll use native link behaviour
      if (!isAllowedHostname(destinationUrl.hostname)) {
        return;
      }

      event.preventDefault();

      const currentSearchParams = getCurrentSearchParams();
      currentSearchParams.forEach(([key, value]) => {
        destinationUrl.searchParams.set(key, value);
      });

      const attributionUserId = window.getAttributionUserId();
      if (attributionUserId) {
        destinationUrl.searchParams.set(
          window.ATTRIBUTION_ID_GLOBAL_KEY,
          attributionUserId
        );
      }

      const destinationUrlString = destinationUrl.toString();
      // If we have a target value, then use it, otherwise change navigate in the same window.
      if (anchorTarget) {
        return window.open(destinationUrlString, anchorTarget);
      }
      window.location = destinationUrlString;
    } catch (e) {
      console.error("Error while intercepting link click", e);
    }
  };

  const getAllLinksAndButtonsToIntercept = (node) => {
    const container = node || document;
    const links = container.querySelectorAll("a");
    const buttons = container.querySelectorAll(
      'button[cc-t-event]:not([cc-t-event=""])'
    );

    return [...links, ...buttons];
  };

  const handleMutatedNode = (isRemoved) => (node) => {
    if (node instanceof HTMLElement) {
      const linksAndButtons = getAllLinksAndButtonsToIntercept(node);

      linksAndButtons.forEach((link) => {
        if (link.nodeName === "BUTTON" && !link.hasAttribute("cc-t-event")) {
          return;
        }

        const hasListener = listenersMap.has(link);

        if (!hasListener) {
          const listener = handleLinkClick(link);
          listenersMap.set(link, listener);
          link.addEventListener("click", listener);
        } else {
          if (isRemoved) {
            link.removeEventListener("click", listenersMap.get(link));
            listenersMap.delete(link);
          }
        }
      });
    }
  };

  const linkMutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutationRecord) => {
      if (mutationRecord.type === "childList") {
        mutationRecord.addedNodes.forEach(handleMutatedNode(false));
        mutationRecord.removedNodes.forEach(handleMutatedNode(true));
      }
    });
  });

  linkMutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  const linksAndButtons = getAllLinksAndButtonsToIntercept();

  linksAndButtons.forEach((link) => {
    const listener = handleLinkClick(link);
    listenersMap.set(link, listener);
    link.addEventListener("click", listener);
  });
})();
