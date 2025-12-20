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
  editFile,
  globFiles,
  grepFiles,
  readFile,
  writeFile,
} from "@/services/file-system-tools";
import {
  getCountryPopulations,
  getGlobalPopulationTrend,
} from "@/services/population-stats";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import TamboAI from "@tambo-ai/typescript-sdk";
import { z } from "zod";

const fileResponse = z.object({
  content: z
    .string()
    .optional()
    .describe(
      "File contents in cat -n format with line numbers. Lines longer than 2000 chars are truncated. Only present for text files.",
    ),
  attachment: z
    .object({
      filename: z.string(),
      mimeType: z.string(),
      url: z.string().describe("Data URL (data:image/png;base64,...)"),
    })
    .optional()
    .describe("For image files, contains the image as a base64 data URL"),
  metadata: z.object({
    path: z.string(),
    size: z.number().describe("File size in bytes"),
    lastModified: z.number().describe("Last modified timestamp"),
    mimeType: z.string(),
    isImage: z.boolean(),
    lineCount: z
      .number()
      .optional()
      .describe("Total number of lines (text files only)"),
    offset: z
      .number()
      .optional()
      .describe("Starting line number (text files only)"),
    limit: z
      .number()
      .optional()
      .describe("Number of lines returned (text files only)"),
  }),
});

type FileResponse = z.infer<typeof fileResponse>;
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
        z.object({
          continent: z.string().optional(),
          sortBy: z.enum(["population", "growthRate"]).optional(),
          limit: z.number().optional(),
          order: z.enum(["asc", "desc"]).optional(),
        }),
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
        z.object({
          startYear: z.number().optional(),
          endYear: z.number().optional(),
        }),
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
      "Reads a file from the local filesystem. You can access any file directly by using this tool. Assume this tool is able to read all files on the machine. If the User provides a path to a file assume that path is valid. It is okay to read a file that does not exist; an error will be returned. Use virtual paths like /folder-name/path/to/file.txt. The path parameter is REQUIRED. By default, reads up to 2000 lines starting from the beginning. You can optionally specify a line offset and limit (especially handy for long files), but it's recommended to read the whole file by not providing these parameters. Results are returned using cat -n format, with line numbers starting at 1. This tool can read image files - images are returned as attachments with data URLs.",
    tool: readFile,
    toolSchema: z
      .function()
      .args(
        z
          .object({
            path: z
              .string()
              .min(1)
              .describe(
                "REQUIRED: Virtual path to the file (e.g., /MyFolder/src/index.ts)",
              ),
            offset: z
              .number()
              .optional()
              .describe(
                "Line number to start reading from (0-indexed, default: 0)",
              ),
            limit: z
              .number()
              .optional()
              .describe("Number of lines to read (default: 2000)"),
            encoding: z
              .string()
              .optional()
              .describe("File encoding (default: utf-8)"),
          })
          .strict(),
      )
      .returns(fileResponse),
    transformToContent(result: FileResponse) {
      const messages: TamboAI.Beta.ChatCompletionContentPart[] = [];
      if (result.content) {
        messages.push({
          type: "text",
          text: result.content,
        });
      }

      if (result.attachment) {
        if (result.attachment.mimeType.startsWith("image/")) {
          messages.push({
            type: "image_url",
            image_url: {
              url: result.attachment.url,
            },
          });
        }
        if (["audio/wav", "audio/mp3"].includes(result.attachment.mimeType)) {
          messages.push({
            type: "input_audio",
            input_audio: {
              data: result.attachment.url,
              format:
                result.attachment.mimeType === "audio/wav" ? "wav" : "mp3",
            },
          });
        }
      }
      return messages;
    },
  },
  {
    name: "writeFile",
    description:
      "Write or overwrite a file in the local file system. Creates parent directories if needed. Use virtual paths like /folder-name/path/to/file.txt. The path and content parameters are REQUIRED.",
    tool: writeFile,
    toolSchema: z
      .function()
      .args(
        z
          .object({
            path: z
              .string()
              .min(1)
              .describe(
                "REQUIRED: Virtual path to the file (e.g., /MyFolder/src/index.ts)",
              ),
            content: z
              .string()
              .describe("REQUIRED: Content to write to the file"),
          })
          .strict(),
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
      "Edit a file by replacing text. Can replace a single occurrence or all occurrences of a string. The path, oldString, and newString parameters are REQUIRED.",
    tool: editFile,
    toolSchema: z
      .function()
      .args(
        z
          .object({
            path: z
              .string()
              .min(1)
              .describe(
                "REQUIRED: Virtual path to the file (e.g., /MyFolder/src/index.ts)",
              ),
            oldString: z
              .string()
              .min(1)
              .describe("REQUIRED: Text to find and replace"),
            newString: z
              .string()
              .describe("REQUIRED: Replacement text (can be empty string)"),
            replaceAll: z
              .boolean()
              .optional()
              .describe("Replace all occurrences (default: false)"),
          })
          .strict(),
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
      "Find files matching a glob pattern across tracked folders. Supports *, **, and ? wildcards. Examples: '**/*.ts' (all TypeScript files), 'src/**/*.tsx' (React components in src). The pattern parameter is REQUIRED.",
    tool: globFiles,
    toolSchema: z
      .function()
      .args(
        z
          .object({
            pattern: z
              .string()
              .min(1)
              .describe("REQUIRED: Glob pattern (e.g., **/*.ts, src/**/*.tsx)"),
            folderName: z
              .string()
              .optional()
              .describe("Limit search to specific folder"),
          })
          .strict(),
      )
      .returns(
        z
          .array(z.string())
          .describe("Array of virtual paths matching the pattern"),
      ),
  },
  {
    name: "grepFiles",
    description:
      "Search for text in files using regex patterns. Returns matching lines with line numbers and context. The pattern parameter is REQUIRED.",
    tool: grepFiles,
    toolSchema: z
      .function()
      .args(
        z
          .object({
            pattern: z
              .string()
              .min(1)
              .describe("REQUIRED: Regular expression pattern to search for"),
            folderName: z
              .string()
              .optional()
              .describe("Limit search to specific folder"),
            filePattern: z
              .string()
              .optional()
              .describe("Glob pattern to filter files (default: **/*)"),
            ignoreCase: z
              .boolean()
              .optional()
              .describe("Case-insensitive search (default: false)"),
          })
          .strict(),
      )
      .returns(
        z.array(
          z.object({
            path: z.string().describe("Virtual path to the file"),
            lineNumber: z
              .number()
              .describe("Line number where match was found"),
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
