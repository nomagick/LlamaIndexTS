import { defaultFS, getEnv, type GenericFileSystem } from "@llamaindex/env";
import { filetypemime } from "magic-bytes.js";
import { Document } from "../Node.js";
import type { FileReader, Language, ResultType } from "./type.js";

/**
 * Represents a reader for parsing files using the LlamaParse API.
 * See https://github.com/run-llama/llama_parse
 */
export class LlamaParseReader implements FileReader {
  // The API key for the LlamaParse API.
  apiKey: string;
  // The base URL of the Llama Parsing API.
  baseUrl: string = "https://api.cloud.llamaindex.ai/api/parsing";
  // The maximum timeout in seconds to wait for the parsing to finish.
  maxTimeout = 2000;
  // The interval in seconds to check if the parsing is done.
  checkInterval = 1;
  // Whether to print the progress of the parsing.
  verbose = true;
  // The result type for the parser.
  resultType: ResultType = "text";
  // The language of the text to parse.
  language: Language = "en";
  // The parsing instruction for the parser.
  parsingInstruction: string = "";

  constructor(params: Partial<LlamaParseReader> = {}) {
    Object.assign(this, params);
    params.apiKey = params.apiKey ?? getEnv("LLAMA_CLOUD_API_KEY");
    if (!params.apiKey) {
      throw new Error(
        "API Key is required for LlamaParseReader. Please pass the apiKey parameter or set the LLAMA_CLOUD_API_KEY environment variable.",
      );
    }
    this.apiKey = params.apiKey;
  }

  async loadData(
    file: string,
    fs: GenericFileSystem = defaultFS,
  ): Promise<Document[]> {
    if (!file.endsWith(".pdf")) {
      throw new Error("Currently, only PDF files are supported.");
    }

    const metadata = { file_path: file };

    // Load data, set the mime type
    const data = await fs.readRawFile(file);
    const mimeType = await this.getMimeType(data);
    const body = new FormData();
    body.set("file", new Blob([data], { type: mimeType }), file);
    body.append("language", this.language);
    body.append("parsingInstruction", this.parsingInstruction);

    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
    };

    // Send the request, start job
    const url = `${this.baseUrl}/upload`;
    let response = await fetch(url, {
      signal: AbortSignal.timeout(this.maxTimeout * 1000),
      method: "POST",
      body,
      headers,
    });
    if (!response.ok) {
      throw new Error(`Failed to parse the PDF file: ${await response.text()}`);
    }
    const jsonResponse = await response.json();

    // Check the status of the job, return when done
    const jobId = jsonResponse.id;
    if (this.verbose) {
      console.log(`Started parsing the file under job id ${jobId}`);
    }

    const resultUrl = `${this.baseUrl}/job/${jobId}/result/${this.resultType}`;

    const start = Date.now();
    let tries = 0;
    while (true) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.checkInterval * 1000),
      );
      response = await fetch(resultUrl, {
        headers,
        signal: AbortSignal.timeout(this.maxTimeout * 1000),
      });

      if (!response.ok) {
        const end = Date.now();
        if (end - start > this.maxTimeout * 1000) {
          throw new Error(
            `Timeout while parsing the PDF file: ${await response.text()}`,
          );
        }
        if (this.verbose && tries % 10 === 0) {
          process.stdout.write(".");
        }
        tries++;
        continue;
      }

      const resultJson = await response.json();
      return [
        new Document({
          text: resultJson[this.resultType],
          metadata: metadata,
        }),
      ];
    }
  }

  private async getMimeType(data: Buffer): Promise<string> {
    const mimes = filetypemime(data);
    if (!mimes.includes("application/pdf")) {
      throw new Error("Currently, only PDF files are supported.");
    }
    return "application/pdf";
  }
}
