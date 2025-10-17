/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import { Graph, graphSchema } from "@/components/tambo/graph";
import { DataCard, dataCardSchema } from "@/components/ui/card-data";
import {
  getCountryPopulations,
  getGlobalPopulationTrend,
} from "@/services/population-stats";
import {
  editFile,
  globFiles,
  grepFiles,
  readFile,
  writeFile,
} from "@/services/file-system-tools";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

/**
 * tools
 *
 * This array contains all the Tambo tools that are registered for use within the application.
 * Each tool is defined with its name, description, and expected props. The tools
 * can be controlled by AI to dynamically fetch data based on user interactions.
 */

export const tools: TamboTool[] = [
  {
    name: "countryPopulation",
    description:
      "A tool to get population statistics by country with advanced filtering options",
    tool: getCountryPopulations,
    toolSchema: z
      .function()
      .args(
        z
          .object({
            continent: z.string().optional(),
            sortBy: z.enum(["population", "growthRate"]).optional(),
            limit: z.number().optional(),
            order: z.enum(["asc", "desc"]).optional(),
          })
          .optional(),
      )
      .returns(
        z.array(
          z.object({
            countryCode: z.string(),
            countryName: z.string(),
            continent: z.enum([
              "Asia",
              "Africa",
              "Europe",
              "North America",
              "South America",
              "Oceania",
            ]),
            population: z.number(),
            year: z.number(),
            growthRate: z.number(),
          }),
        ),
      ),
  },
  {
    name: "globalPopulation",
    description:
      "A tool to get global population trends with optional year range filtering",
    tool: getGlobalPopulationTrend,
    toolSchema: z
      .function()
      .args(
        z
          .object({
            startYear: z.number().optional(),
            endYear: z.number().optional(),
          })
          .optional(),
      )
      .returns(
        z.array(
          z.object({
            year: z.number(),
            population: z.number(),
            growthRate: z.number(),
          }),
        ),
      ),
  },
  // File System Tools
  {
    name: "readFile",
    description:
      "Read the contents of a file from the local file system. Use virtual paths like /folder-name/path/to/file.txt",
    tool: readFile,
    toolSchema: z
      .function()
      .args(
        z.object({
          path: z.string().describe("Virtual path to the file (e.g., /MyFolder/src/index.ts)"),
          encoding: z.string().optional().describe("File encoding (default: utf-8)"),
        }),
      )
      .returns(z.string().describe("File contents as a string")),
  },
  {
    name: "writeFile",
    description:
      "Write or overwrite a file in the local file system. Creates parent directories if needed. Use virtual paths like /folder-name/path/to/file.txt",
    tool: writeFile,
    toolSchema: z
      .function()
      .args(
        z.object({
          path: z.string().describe("Virtual path to the file (e.g., /MyFolder/src/index.ts)"),
          content: z.string().describe("Content to write to the file"),
        }),
      )
      .returns(
        z.object({
          success: z.boolean(),
          message: z.string(),
        }),
      ),
  },
  {
    name: "editFile",
    description:
      "Edit a file by replacing text. Can replace a single occurrence or all occurrences of a string.",
    tool: editFile,
    toolSchema: z
      .function()
      .args(
        z.object({
          path: z.string().describe("Virtual path to the file (e.g., /MyFolder/src/index.ts)"),
          oldString: z.string().describe("Text to find and replace"),
          newString: z.string().describe("Replacement text"),
          replaceAll: z.boolean().optional().describe("Replace all occurrences (default: false)"),
        }),
      )
      .returns(
        z.object({
          success: z.boolean(),
          message: z.string(),
          replacements: z.number().describe("Number of replacements made"),
        }),
      ),
  },
  {
    name: "globFiles",
    description:
      "Find files matching a glob pattern across tracked folders. Supports *, **, and ? wildcards. Examples: '**/*.ts' (all TypeScript files), 'src/**/*.tsx' (React components in src)",
    tool: globFiles,
    toolSchema: z
      .function()
      .args(
        z.object({
          pattern: z.string().describe("Glob pattern (e.g., **/*.ts, src/**/*.tsx)"),
          folderName: z.string().optional().describe("Limit search to specific folder"),
        }),
      )
      .returns(
        z.array(z.string()).describe("Array of virtual paths matching the pattern"),
      ),
  },
  {
    name: "grepFiles",
    description:
      "Search for text in files using regex patterns. Returns matching lines with line numbers and context.",
    tool: grepFiles,
    toolSchema: z
      .function()
      .args(
        z.object({
          pattern: z.string().describe("Regular expression pattern to search for"),
          folderName: z.string().optional().describe("Limit search to specific folder"),
          filePattern: z.string().optional().describe("Glob pattern to filter files (default: **/*)"),
          ignoreCase: z.boolean().optional().describe("Case-insensitive search (default: false)"),
        }),
      )
      .returns(
        z.array(
          z.object({
            path: z.string().describe("Virtual path to the file"),
            lineNumber: z.number().describe("Line number where match was found"),
            line: z.string().describe("The matching line content"),
            column: z.number().describe("Column where match starts"),
          }),
        ),
      ),
  },
];

/**
 * components
 *
 * This array contains all the Tambo components that are registered for use within the application.
 * Each component is defined with its name, description, and expected props. The components
 * can be controlled by AI to dynamically render UI elements based on user interactions.
 */
export const components: TamboComponent[] = [
  {
    name: "Graph",
    description:
      "A component that renders various types of charts (bar, line, pie) using Recharts. Supports customizable data visualization with labels, datasets, and styling options.",
    component: Graph,
    propsSchema: graphSchema,
  },
  {
    name: "DataCard",
    description:
      "A component that displays options as clickable cards with links and summaries with the ability to select multiple items.",
    component: DataCard,
    propsSchema: dataCardSchema,
  },
  // Add more components here
];
