import "server-only";
import { cache } from "react";
import { listGames } from "@/lib/data/games";
import { prismaSource } from "@/lib/data/prismaSource";
import type { Component, Game } from "@/lib/engine/types";

/** One DB read per request, shared by every component that needs the catalog. */
export const getCatalog = cache((): Promise<Component[]> => prismaSource.listAll());
export const getGames = cache((): Promise<Game[]> => listGames());

/** Short, shareable build ids (US-17), e.g. "k7x2m9qa". */
export function newBuildId(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
