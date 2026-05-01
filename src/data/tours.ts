import tourData from "../../tours.json";
import type { Tour } from "../domain/types";

export const tours = tourData as Tour[];

export const toursById = new Map(tours.map((tour) => [tour.id, tour]));

export const orderedTours = [...tours].sort((a, b) => {
  if (a.categoryOrder !== b.categoryOrder) {
    return a.categoryOrder - b.categoryOrder;
  }

  return a.tourOrder - b.tourOrder;
});

