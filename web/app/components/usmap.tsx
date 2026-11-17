/* eslint-disable @typescript-eslint/no-explicit-any */
import { geoAlbersUsa, geoPath } from "d3-geo";
import { feature, mesh } from "topojson-client";
import usTopo from "us-atlas/states-10m.json";

export const MAP_W = 975, MAP_H = 610;
const projection = geoAlbersUsa().scale(1300).translate([MAP_W / 2, MAP_H / 2]);
const path = geoPath(projection);
const us = usTopo as any;

export const STATES: { id: string; name: string; d: string; c: [number, number] }[] =
  (feature(us, us.objects.states) as any).features
    .map((f: any) => ({ id: String(f.id), name: f.properties.name, d: path(f) || "", c: path.centroid(f) as [number, number] }))
    .filter((s: any) => s.d);

export const BORDERS = path(mesh(us, us.objects.states, (a: any, b: any) => a !== b) as any) || "";
export const NATION = path(feature(us, us.objects.nation) as any) || "";
export const project = (lon: number, lat: number) => projection([lon, lat]) as [number, number] | null;

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  PR: "Puerto Rico", VI: "U.S. Virgin Islands", GU: "Guam",
};