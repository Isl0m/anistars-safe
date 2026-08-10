const START_PARAM_ROUTES = [{ pattern: "^market[_-](\\d+)$", path: "/market/" }];

export const startParamRedirectScript = `
(function () {
  try {
    var hash = location.hash.slice(1);
    if (!hash) return;
    var param = new URLSearchParams(hash).get("tgWebAppStartParam");
    if (!param) return;
    var routes = ${JSON.stringify(START_PARAM_ROUTES)};
    for (var i = 0; i < routes.length; i++) {
      var match = param.match(new RegExp(routes[i].pattern));
      if (!match) continue;
      var target = routes[i].path + match[1];
      if (location.pathname !== target) {
        location.replace(target + location.hash);
      }
      return;
    }
  } catch (e) {}
})();
`;
