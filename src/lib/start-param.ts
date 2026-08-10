const START_PARAM_ROUTES = [{ pattern: "^market[_-](\\d+)$", path: "/market/" }];

export const startParamRedirectScript = `
(function () {
  try {
    var normalize = function (url) {
      return url.replace(/^[^?#]*[?#]/, "").replace(/[?#]/g, "&");
    };
    var sources = [location.href];
    try {
      var nav = performance.getEntriesByType("navigation")[0];
      if (nav && nav.name) sources.push(nav.name);
    } catch (e) {}

    var param = null;
    for (var s = 0; s < sources.length && !param; s++) {
      param = new URLSearchParams(normalize(sources[s])).get(
        "tgWebAppStartParam"
      );
    }
    if (!param) return;

    var routes = ${JSON.stringify(START_PARAM_ROUTES)};
    for (var i = 0; i < routes.length; i++) {
      var match = param.match(new RegExp(routes[i].pattern));
      if (!match) continue;
      var target = routes[i].path + match[1];
      if (location.pathname !== target) {
        location.replace(target + location.search + location.hash);
      }
      return;
    }
  } catch (e) {}
})();
`;
