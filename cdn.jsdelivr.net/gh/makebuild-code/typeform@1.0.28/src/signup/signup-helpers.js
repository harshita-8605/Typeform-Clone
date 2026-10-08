(function signUpHelpersScope() {
  const AUTH_BRIDGE_LOGIN_CALLBACK =
    "https://admin.typeform.com/auth/okta/callback";
  const OKTA_URL = "https://auth.typeform.com/oauth2/default/v1/authorize";
  const OKTA_CLIENT_ID = "0oa1nigb1jQqJMb7f4x7";
  const IDP_IDS = {
    google: "0oa1nic7hmTM5eytN4x7",
    microsoft: "0oa3ms5jd9FloU2RI4x7",
  };
  const COOKIE_DOMAIN = ".typeform.com";

  function addCookiesData(signupData) {
    const cookies = ["gspk", "gsxid", "_ga", "_fbp", "_fbc", "cje"].reduce(
      (acc, cookie) => {
        const value = Cookies.get(cookie);
        return value ? { ...acc, [cookie]: value } : acc;
      },
      {}
    );

    return {
      ...signupData,
      cookies,
    };
  }

  function addParamsData(signupData) {
    const currentSearchParams = new window.URLSearchParams(
      window.location.search
    );
    return {
      ...signupData,
      searchParams: {
        ...Object.fromEntries(currentSearchParams),
        tid: window.tid,
      },
    };
  }

  function addReferrer(signupData) {
    const data = { ...signupData };
    if (document.referrer) {
      data.referrer = document.referrer;
    }
    return data;
  }

  function addCelloReferralCode(signupData) {
    const celloReferral = Cookies.get("cello-referral");
    return celloReferral ? { ...signupData, celloReferral } : signupData;
  }

  function addReferralCode(signupData) {
    const currentSearchParams = new window.URLSearchParams(
      window.location.search
    );
    const referralCode = currentSearchParams.get("rsCode");
    return referralCode ? { ...signupData, referralCode } : signupData;
  }

  function addPartnerStackData(signupData) {
    const gspk = Cookies.get("gspk");
    const gsxid = Cookies.get("gsxid");

    let data;

    if (gspk && gsxid) {
      try {
        data = {
          ...signupData,
          partnerstack: {
            partnerKey: window.atob(gspk),
            userId: gsxid,
          },
        };
      } catch (e) {
        data = signupData;
      }
    }

    return data;
  }

  function addOneTapData(isOneTap = false) {
    return (signupData) => {
      return isOneTap ? { ...signupData, isOneTap: "yes" } : signupData;
    };
  }

  function setPartnerStackCookiesFromParams() {
    const currentSearchParams = new window.URLSearchParams(
      window.location.search
    );

    const cookieConfig = getCookieConfig(90);

    const gspk = currentSearchParams.get("gspk");
    const gsxid = currentSearchParams.get("gsxid");

    if (gspk && gsxid) {
      // persist cookie only if gspk is legit
      try {
        window.atob(gspk);
      } catch (e) {
        return;
      }
      Cookies.set("gspk", gspk, cookieConfig);
      Cookies.set("gsxid", gsxid, cookieConfig);
    }
  }

  const compose =
    (...functions) =>
    (args) =>
      functions.reduceRight((arg, fn) => fn(arg), args);

  function buildSignupExtra(isOneTap = false) {
    return compose(
      addCookiesData,
      addParamsData,
      addReferrer,
      addCelloReferralCode,
      addReferralCode,
      addOneTapData(isOneTap),
      addPartnerStackData
    )({});
  }

  function getCookieConfig(expirationInDays = "") {
    const config = {
      path: "/",
      domain: COOKIE_DOMAIN,
      secure: true,
      sameSite: "none",
      partitioned: true,
    };

    if (expirationInDays) {
      config.expires = expirationInDays;
    }

    return config;
  }

  function generateId(n = 22) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let text = "";
    for (let i = 0; i < n; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return text;
  }

  function generateState(newTabState = false) {
    const state = generateId();
    const in10Minutes = (1 / (24 * 60)) * 10; // 1day => 24h * 60 mins
    Cookies.set("signup_state", state, getCookieConfig(in10Minutes));

    return state;
  }
  function setSignupCookies({ provider, isOneTap }) {
    const cookieConfig = getCookieConfig(365);
    const sessionCookieConfig = getCookieConfig();
    const device = isMobile.any ? "mobile" : "desktop";
    const computedIsOneTap = isOneTap || false;

    Cookies.set("signup_provider", provider, getCookieConfig(365));

    Cookies.set("signup_device", device, cookieConfig);
    Cookies.set("signup_user_agent", navigator.userAgent, cookieConfig);
    Cookies.set(
      "signup_extra",
      JSON.stringify(buildSignupExtra(computedIsOneTap)),
      sessionCookieConfig
    );

    setPartnerStackCookiesFromParams();
  }

  function getSocialSignupRedirectUrl(idpName, loginHint) {
    const state = generateState();
    const idp = IDP_IDS[idpName];

    if (!idp) {
      throw new Error(`IDP ID for ${idpName} not found`);
    }

    const params = {
      client_id: OKTA_CLIENT_ID,
      idp,
      response_type: "code",
      scope: "openid email",
      redirect_uri: AUTH_BRIDGE_LOGIN_CALLBACK,
      nonce: generateId(),
      state,
    };
    const queries = new URLSearchParams(params);

    if (loginHint) {
      queries.append("login_hint", loginHint);
    }

    const socialSignupRedirectUrl = new URL(OKTA_URL);
    socialSignupRedirectUrl.search = queries.toString();

    return socialSignupRedirectUrl.toString();
  }

  window.signUpHelpers = {
    setSignupCookies,
    getSocialSignupRedirectUrl,
  };

  window.dispatchEvent(new Event("signup-helpers:loaded"));
})();
