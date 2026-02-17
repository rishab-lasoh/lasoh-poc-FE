// Utility to check if RudderStack is loaded
export const isRudderStackReady = () => {
  return typeof window !== 'undefined' && window.rudderanalytics !== undefined;
};

// Optional: Helper to track events with error handling
export const trackEvent = (eventName, properties = {}) => {
  if (isRudderStackReady()) {
    window.rudderanalytics.track(eventName, properties);
  } else {
    console.warn('RudderStack not initialized');
  }
};

// Optional: Helper to identify users
export const identifyUser = (userId, traits = {}) => {
  if (isRudderStackReady()) {
    window.rudderanalytics.identify(userId, traits);
  } else {
    console.warn('RudderStack not initialized');
  }
};
