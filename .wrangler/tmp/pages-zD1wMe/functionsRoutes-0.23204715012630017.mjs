import { onRequest as __api___path___js_onRequest } from "D:\\RefZone 2.0\\RefereeZone\\functions\\api\\[[path]].js"
import { onRequestGet as __robots_txt_js_onRequestGet } from "D:\\RefZone 2.0\\RefereeZone\\functions\\robots.txt.js"
import { onRequestGet as __sitemap_xml_js_onRequestGet } from "D:\\RefZone 2.0\\RefereeZone\\functions\\sitemap.xml.js"

export const routes = [
    {
      routePath: "/api/:path*",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api___path___js_onRequest],
    },
  {
      routePath: "/robots.txt",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__robots_txt_js_onRequestGet],
    },
  {
      routePath: "/sitemap.xml",
      mountPath: "/",
      method: "GET",
      middlewares: [],
      modules: [__sitemap_xml_js_onRequestGet],
    },
  ]