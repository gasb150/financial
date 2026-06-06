(function(globalScope) {
  function createAppStore(initialState = {}) {
    let state = { ...initialState };
    const subscribers = new Set();

    function getState() {
      return state;
    }

    function setState(patch = {}) {
      state = { ...state, ...patch };
      subscribers.forEach((subscriber) => subscriber(state));
      return state;
    }

    function updateState(updater) {
      if(typeof updater !== 'function') return state;
      return setState(updater(state) || {});
    }

    function select(selector, fallback = undefined) {
      if(typeof selector !== 'function') return fallback;
      try {
        const selected = selector(state);
        return selected === undefined ? fallback : selected;
      } catch(_error) {
        return fallback;
      }
    }

    function subscribe(subscriber) {
      if(typeof subscriber !== 'function') return () => {};
      subscribers.add(subscriber);
      return () => subscribers.delete(subscriber);
    }

    return {
      getState,
      setState,
      updateState,
      select,
      subscribe
    };
  }

  globalScope.FinancialAppStore = {
    createAppStore
  };
})(window);
