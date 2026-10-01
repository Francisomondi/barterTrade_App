import {
  describe,
  expect,
  it,
} from "vitest";

import router
  from "../routes/businessRoutes.js";


/**
 * =========================================================
 * 9.11.19.20.6
 * BUSINESS REPORT ROUTE TESTS
 * =========================================================
 *
 * Verifies:
 *
 * - GET /me/reports exists
 * - GET /me/reports/:reportType exists
 * - both routes use protect
 * - correct controllers are wired
 * - private /me report routes precede /:slug
 *
 * No database requests are made.
 * =========================================================
 */


const getRouteLayers = () =>
  router.stack.filter(
    (layer) =>
      layer.route
  );


const getRoutePath = (
  layer
) =>
  layer.route?.path;


const getMethods = (
  layer
) =>
  Object.keys(
    layer.route?.methods || {}
  ).filter(
    (method) =>
      layer.route.methods[
        method
      ]
  );


const getHandlerNames = (
  layer
) =>
  layer.route.stack.map(
    (handlerLayer) =>
      handlerLayer.handle
        ?.name ||
      handlerLayer.name ||
      ""
  );


const findRoute = (
  path,
  method = "get"
) =>
  getRouteLayers().find(
    (layer) =>
      getRoutePath(layer) ===
        path &&
      Boolean(
        layer.route
          ?.methods
          ?.[method]
      )
  );


describe(
  "Business report route registration",
  () => {
    it(
      "registers GET /me/reports",
      () => {
        const route =
          findRoute(
            "/me/reports"
          );

        expect(
          route
        ).toBeDefined();

        expect(
          getMethods(route)
        ).toContain(
          "get"
        );
      }
    );


    it(
      "registers GET /me/reports/:reportType",
      () => {
        const route =
          findRoute(
            "/me/reports/:reportType"
          );

        expect(
          route
        ).toBeDefined();

        expect(
          getMethods(route)
        ).toContain(
          "get"
        );
      }
    );


    it(
      "/me/reports uses protect middleware",
      () => {
        const route =
          findRoute(
            "/me/reports"
          );

        const handlers =
          getHandlerNames(
            route
          );

        expect(
          handlers
        ).toContain(
          "protect"
        );
      }
    );


    it(
      "/me/reports/:reportType uses protect middleware",
      () => {
        const route =
          findRoute(
            "/me/reports/:reportType"
          );

        const handlers =
          getHandlerNames(
            route
          );

        expect(
          handlers
        ).toContain(
          "protect"
        );
      }
    );


    it(
      "/me/reports points to report access controller",
      () => {
        const route =
          findRoute(
            "/me/reports"
          );

        const handlers =
          getHandlerNames(
            route
          );

        expect(
          handlers
        ).toContain(
          "getMyBusinessReportAccess"
        );
      }
    );


    it(
      "/me/reports/:reportType points to report generation controller",
      () => {
        const route =
          findRoute(
            "/me/reports/:reportType"
          );

        const handlers =
          getHandlerNames(
            route
          );

        expect(
          handlers
        ).toContain(
          "generateMyBusinessReport"
        );
      }
    );


    it(
      "protect executes before report access controller",
      () => {
        const route =
          findRoute(
            "/me/reports"
          );

        const handlers =
          getHandlerNames(
            route
          );

        const protectIndex =
          handlers.indexOf(
            "protect"
          );

        const controllerIndex =
          handlers.indexOf(
            "getMyBusinessReportAccess"
          );

        expect(
          protectIndex
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          controllerIndex
        ).toBeGreaterThan(
          protectIndex
        );
      }
    );


    it(
      "protect executes before report generation controller",
      () => {
        const route =
          findRoute(
            "/me/reports/:reportType"
          );

        const handlers =
          getHandlerNames(
            route
          );

        const protectIndex =
          handlers.indexOf(
            "protect"
          );

        const controllerIndex =
          handlers.indexOf(
            "generateMyBusinessReport"
          );

        expect(
          protectIndex
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          controllerIndex
        ).toBeGreaterThan(
          protectIndex
        );
      }
    );


    it(
      "report access route appears before public /:slug route",
      () => {
        const layers =
          getRouteLayers();

        const reportIndex =
          layers.findIndex(
            (layer) =>
              getRoutePath(
                layer
              ) ===
              "/me/reports"
          );

        const slugIndex =
          layers.findIndex(
            (layer) =>
              getRoutePath(
                layer
              ) ===
              "/:slug"
          );

        expect(
          reportIndex
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          slugIndex
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          reportIndex
        ).toBeLessThan(
          slugIndex
        );
      }
    );


    it(
      "report generation route appears before public /:slug route",
      () => {
        const layers =
          getRouteLayers();

        const reportIndex =
          layers.findIndex(
            (layer) =>
              getRoutePath(
                layer
              ) ===
              "/me/reports/:reportType"
          );

        const slugIndex =
          layers.findIndex(
            (layer) =>
              getRoutePath(
                layer
              ) ===
              "/:slug"
          );

        expect(
          reportIndex
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          slugIndex
        ).toBeGreaterThanOrEqual(
          0
        );

        expect(
          reportIndex
        ).toBeLessThan(
          slugIndex
        );
      }
    );


    it(
      "report routes are GET-only",
      () => {
        const accessRoute =
          findRoute(
            "/me/reports"
          );

        const generationRoute =
          findRoute(
            "/me/reports/:reportType"
          );

        expect(
          getMethods(
            accessRoute
          )
        ).toEqual([
          "get",
        ]);

        expect(
          getMethods(
            generationRoute
          )
        ).toEqual([
          "get",
        ]);
      }
    );


    it(
      "does not expose an unprotected duplicate report generation route",
      () => {
        const matches =
          getRouteLayers().filter(
            (layer) =>
              getRoutePath(
                layer
              ) ===
              "/me/reports/:reportType"
          );

        expect(
          matches
        ).toHaveLength(1);

        const handlers =
          getHandlerNames(
            matches[0]
          );

        expect(
          handlers
        ).toContain(
          "protect"
        );
      }
    );
  }
);