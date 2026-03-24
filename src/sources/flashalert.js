import { XMLParser } from "fast-xml-parser";

import { fetchText } from "../http.js";

const FLASHALERT_XML_URL =
  "https://www.flashalertnewswire.net/IIN/reportsX/flashnews_xml2.php?RegionID=";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  isArray: (tagName) =>
    tagName == "news_category" ||
    tagName == "news_report" ||
    tagName == "emergency_category" ||
    tagName == "emergency_report",
});

const text = (value) =>
  typeof value == "string" ? value.trim() : value?.["#text"]?.trim() || "";

export const loadDistrictAlerts = async (news) => {
  const xml = await fetchText(`${FLASHALERT_XML_URL}${news.regionId}`);
  const parsed = parser.parse(xml);

  const newsItems = (parsed.flashnews?.news?.news_category ?? []).flatMap(
    (category) => category.news_report ?? [],
  );

  const emergencyItems = (
    parsed.flashnews?.emergency?.emergency_category ?? []
  ).flatMap((category) => category.emergency_report ?? []);

  const items = [...newsItems, ...emergencyItems]
    .sort((a, b) => b["@_effective_date"].localeCompare(a["@_effective_date"]))
    .filter((item) => text(item.orgname) == news.org)
    .map((item) => text(item.headline) || text(item.detail))
    .filter(Boolean);

  return [...new Set(items)];
};
