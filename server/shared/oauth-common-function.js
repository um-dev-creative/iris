const jwt = require('jsonwebtoken');
const {setUserSession, getUserSession} = require("./user-session-store");
const {getOAuthClient} = require("../proxy/oauth-client");
const {safeParseJson} = require("./common-function");
const APPLICATION_ID = process.env.APPLICATION_ID;
const INNER_AUTH_PATH = process.env.API_MERCURY_SESSION_RELATIVE_PATH;
const RAW_API_SERVICE_MERCURY_MAP = process.env.API_MERCURY_MAP;
const API_SERVICE_MERCURY_MAP = safeParseJson(RAW_API_SERVICE_MERCURY_MAP);
const OAUTH_AUTHENTICATION_TYPE = process.env.AUTH_AUTHENTICATION_TYPE;
const OAUTH_CLIENT_ID = process.env.AUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.AUTH_CLIENT_SECRET;
const OAUTH_GRANT_TYPE = process.env.AUTH_GRANT_TYPE;
const OAUTH_TOKEN_URL = process.env.AUTH_SERVER_URI;
const OAUTH_USER_ALIAS = process.env.AUTH_USER_ALIAS;
const OAUTH_USER_PASSWORD = process.env.AUTH_USER_PASSWORD;

/**
 * Creates a session element with the provided parameters.
 * @param session - The current session data.
 * @param userId - The user ID to associate with the session.
 * @param mercuryBearerToken - The bearer token for Directory Backend services.
 * @param mercurySessionToken - The session token for Directory Backend services.
 * @returns {Promise<*&{mercurySession, mercurySessionExpiresAt, mercuryBearerToken}>}
 */
async function getSessionElement(session, userId, mercuryBearerToken, mercurySessionToken) {
  const sessionData = {
    ...session,
    mercurySession: mercurySessionToken||session?.mercurySession|| null,
    mercurySessionExpiresAt: Date.now() + 60 * 60 * 1000, // 1 hora
    mercuryBearerToken: mercuryBearerToken||session?.mercuryBearerToken|| null,
  };

  setUserSession(userId, null, sessionData);
  return sessionData;
}

/**
 * Retrieves the session token for the Directory Backend services.
 * @param userId - The user ID to retrieve the session for.
 * @param mercuryOauthClientConfig - The configuration for the Directory OAuth client.
 * @returns {Promise<{mercuryBearerToken}|{mercurySession}|SessionData|*>}
 */
async function getMercurySessionToken(userId, mercuryOauthClientConfig) {
  const sessionData = getUserSession(userId);
  if (sessionData && sessionData.mercurySession && sessionData.mercuryBearerToken && sessionData.mercurySessionExpiresAt > Date.now() && sessionData.backboneSessionExpiresAt > Date.now()) {
    return sessionData;
  }
  const mercuryBearerToken = await getOAuthClient(mercuryOauthClientConfig).getBearerToken();
  return getSessionElement(sessionData, userId, mercuryBearerToken);
}

/**
 * Extracts the user ID from the JWT token.
 * @param backboneJWT - The JWT token to decode.
 * @returns {*|null}
 */
function getUserId(backboneJWT) {
  // Decode the payload without verifying the signature
  const decoded = jwt.decode(backboneJWT);

  if (decoded && decoded.uid) {
    console.log('UID:', decoded.uid);
    return decoded.uid;
  } else {
    console.log('UID not found in the token.');
    return null;
  }
}

module.exports = {
  APPLICATION_ID,
  INNER_AUTH_PATH,
  API_SERVICE_MERCURY_MAP,
  OAUTH_AUTHENTICATION_TYPE,
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  OAUTH_GRANT_TYPE,
  OAUTH_TOKEN_URL,
  OAUTH_USER_ALIAS,
  OAUTH_USER_PASSWORD,


  getSessionElement,
  getMercurySessionToken: getMercurySessionToken,
  getUserId
}
