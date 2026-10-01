// CREATE — server/src/tests/businessReportExportSecurity.test.js

import assert from "node:assert/strict";

import {
  BUSINESS_REPORT_FORMATS,
} from "../config/businessReportConfig.js";

import {
  BUSINESS_REPORT_EXPORT_MIME_TYPES,
  BUSINESS_REPORT_EXPORT_EXTENSIONS,

  buildSafeBusinessReportFileName,
  buildSafeContentDisposition,
  buildBusinessReportExportHeaders,
  applyBusinessReportExportHeaders,
  buildBusinessReportExportResponseConfig,
  getBusinessReportExportSecurityCapabilities,
} from "../services/businessReportExportSecurityService.js";


/**
 * =========================================================
 * BUSINESS REPORT EXPORT SECURITY TEST
 * =========================================================
 *
 * Roadmap:
 *
 * 9.11.19.20.2 — Export Security Testing
 *
 * Verifies:
 *
 * - trusted MIME types
 * - trusted extensions
 * - unsupported formats
 * - filename sanitization
 * - path traversal protection
 * - CRLF/header injection protection
 * - extension spoofing protection
 * - Content-Disposition safety
 * - nosniff
 * - private/no-store caching
 * - referrer protection
 * - Express response header application
 * - safe response configuration
 * - security capability declaration
 *
 * No database or Prisma access is required.
 * =========================================================
 */


/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

const runTest = async (
  name,
  callback
) => {
  try {
    await callback();

    console.log(
      `✅ ${name}`
    );

    return {
      name,
      passed: true,
    };
  } catch (error) {
    console.error(
      `❌ ${name}`
    );

    console.error(
      error
    );

    return {
      name,
      passed: false,
      error,
    };
  }
};


const assertSafeFileName = (
  fileName
) => {
  assert.equal(
    /[\r\n]/.test(
      fileName
    ),
    false,
    "Filename contains CR/LF characters."
  );

  assert.equal(
    fileName.includes("/"),
    false,
    "Filename contains forward-slash path separator."
  );

  assert.equal(
    fileName.includes("\\"),
    false,
    "Filename contains backslash path separator."
  );

  assert.equal(
    fileName.includes('"'),
    false,
    "Filename contains quote characters."
  );

  assert.equal(
    fileName.includes(";"),
    false,
    "Filename contains semicolon characters."
  );
};


/**
 * =========================================================
 * MIME TYPE MAPPING
 * =========================================================
 */

const testTrustedMimeTypes = () => {
  assert.equal(
    BUSINESS_REPORT_EXPORT_MIME_TYPES[
      BUSINESS_REPORT_FORMATS.JSON
    ],
    "application/json; charset=utf-8"
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_MIME_TYPES[
      BUSINESS_REPORT_FORMATS.CSV
    ],
    "text/csv; charset=utf-8"
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_MIME_TYPES[
      BUSINESS_REPORT_FORMATS.PDF_READY
    ],
    "application/json; charset=utf-8"
  );
};


/**
 * =========================================================
 * EXTENSION MAPPING
 * =========================================================
 */

const testTrustedExtensions = () => {
  assert.equal(
    BUSINESS_REPORT_EXPORT_EXTENSIONS[
      BUSINESS_REPORT_FORMATS.JSON
    ],
    "json"
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_EXTENSIONS[
      BUSINESS_REPORT_FORMATS.CSV
    ],
    "csv"
  );

  assert.equal(
    BUSINESS_REPORT_EXPORT_EXTENSIONS[
      BUSINESS_REPORT_FORMATS.PDF_READY
    ],
    "json",
    "PDF_READY must remain structured JSON rather than binary PDF."
  );
};


/**
 * =========================================================
 * UNSUPPORTED FORMAT
 * =========================================================
 */

const testUnsupportedFormatFailsClosed =
  () => {
    assert.throws(
      () =>
        buildSafeBusinessReportFileName({
          reportType:
            "BUSINESS_PERFORMANCE",

          format:
            "PDF",
        }),

      (error) => {
        assert.equal(
          error.code,
          "UNSUPPORTED_REPORT_FORMAT"
        );

        return true;
      }
    );

    assert.throws(
      () =>
        buildBusinessReportExportHeaders({
          format:
            "XLSX",
        }),

      (error) => {
        assert.equal(
          error.code,
          "UNSUPPORTED_REPORT_FORMAT"
        );

        return true;
      }
    );

    assert.throws(
      () =>
        buildBusinessReportExportResponseConfig({
          reportType:
            "BUSINESS_PERFORMANCE",

          format:
            null,
        }),

      (error) => {
        assert.equal(
          error.code,
          "UNSUPPORTED_REPORT_FORMAT"
        );

        return true;
      }
    );
  };


/**
 * =========================================================
 * SAFE FILENAMES
 * =========================================================
 */

const testNormalFileName = () => {
  const fileName =
    buildSafeBusinessReportFileName({
      reportType:
        "BUSINESS_PERFORMANCE",

      format:
        BUSINESS_REPORT_FORMATS.JSON,

      generatedAt:
        "2026-10-01T09:00:00.000Z",
    });

  assert.equal(
    fileName,
    "BUSINESS_PERFORMANCE-2026-10-01.json"
  );

  assertSafeFileName(
    fileName
  );
};


const testCsvFileName = () => {
  const fileName =
    buildSafeBusinessReportFileName({
      reportType:
        "LISTING_PERFORMANCE",

      format:
        BUSINESS_REPORT_FORMATS.CSV,

      generatedAt:
        "2026-10-01T09:00:00.000Z",
    });

  assert.equal(
    fileName,
    "LISTING_PERFORMANCE-2026-10-01.csv"
  );
};


const testPdfReadyFileName =
  () => {
    const fileName =
      buildSafeBusinessReportFileName({
        reportType:
          "BUSINESS_INTELLIGENCE",

        format:
          BUSINESS_REPORT_FORMATS
            .PDF_READY,

        generatedAt:
          "2026-10-01T09:00:00.000Z",

        suffix:
          "pdf-ready",
      });

    assert.equal(
      fileName,
      "BUSINESS_INTELLIGENCE-pdf-ready-2026-10-01.json"
    );

    assert.equal(
      fileName.endsWith(
        ".pdf"
      ),
      false
    );
  };


/**
 * =========================================================
 * PATH TRAVERSAL
 * =========================================================
 */

const testPathTraversalProtection =
  () => {
    const attacks = [
      "../../etc/passwd",

      "..\\..\\windows\\system32",

      "../../../../secret",

      "/var/log/private",

      "C:\\Windows\\System32\\drivers\\etc\\hosts",
    ];

    for (
      const attack
      of attacks
    ) {
      const fileName =
        buildSafeBusinessReportFileName({
          reportType:
            attack,

          format:
            BUSINESS_REPORT_FORMATS.JSON,

          generatedAt:
            "2026-10-01",
        });

      assertSafeFileName(
        fileName
      );

      assert.equal(
        fileName.includes(
          ".."
        ),
        false,
        `Path traversal sequence survived sanitization: ${fileName}`
      );
    }
  };


/**
 * =========================================================
 * HEADER / CRLF INJECTION
 * =========================================================
 */

const testCrLfInjectionProtection =
  () => {
    const malicious =
      "BUSINESS\r\nX-Evil-Header: injected";

    const fileName =
      buildSafeBusinessReportFileName({
        reportType:
          malicious,

        format:
          BUSINESS_REPORT_FORMATS.JSON,

        generatedAt:
          "2026-10-01",
      });

    assertSafeFileName(
      fileName
    );

    assert.equal(
      fileName.includes(
        "\r"
      ),
      false
    );

    assert.equal(
      fileName.includes(
        "\n"
      ),
      false
    );

    assert.equal(
      fileName.includes(
        ":"
      ),
      false
    );
  };


const testContentDispositionInjectionProtection =
  () => {
    const malicious =
      'report.csv"\r\nX-Injected: yes\r\n"';

    const disposition =
      buildSafeContentDisposition({
        fileName:
          malicious,

        format:
          BUSINESS_REPORT_FORMATS.CSV,

        attachment:
          true,
      });

    assert.equal(
      disposition.startsWith(
        'attachment; filename="'
      ),
      true
    );

    assert.equal(
      disposition.includes(
        "\r"
      ),
      false
    );

    assert.equal(
      disposition.includes(
        "\n"
      ),
      false
    );

    assert.equal(
      disposition.includes(
        "X-Injected:"
      ),
      false
    );

    assert.equal(
      disposition.endsWith(
        '.csv"'
      ),
      true
    );
  };


/**
 * =========================================================
 * EXTENSION SPOOFING
 * =========================================================
 */

const testExtensionSpoofingProtection =
  () => {
    const csvDisposition =
      buildSafeContentDisposition({
        fileName:
          "business-report.exe",

        format:
          BUSINESS_REPORT_FORMATS.CSV,

        attachment:
          true,
      });

    assert.equal(
      csvDisposition,
      'attachment; filename="business-report.csv"'
    );

    const jsonDisposition =
      buildSafeContentDisposition({
        fileName:
          "report.pdf",

        format:
          BUSINESS_REPORT_FORMATS.JSON,

        attachment:
          true,
      });

    assert.equal(
      jsonDisposition,
      'attachment; filename="report.json"'
    );

    const pdfReadyDisposition =
      buildSafeContentDisposition({
        fileName:
          "report.pdf",

        format:
          BUSINESS_REPORT_FORMATS
            .PDF_READY,

        attachment:
          true,
      });

    assert.equal(
      pdfReadyDisposition,
      'attachment; filename="report.json"'
    );
  };


/**
 * =========================================================
 * CONTENT-DISPOSITION
 * =========================================================
 */

const testAttachmentDisposition =
  () => {
    const disposition =
      buildSafeContentDisposition({
        fileName:
          "business-report.json",

        format:
          BUSINESS_REPORT_FORMATS.JSON,

        attachment:
          true,
      });

    assert.equal(
      disposition,
      'attachment; filename="business-report.json"'
    );
  };


const testInlineDisposition =
  () => {
    const disposition =
      buildSafeContentDisposition({
        fileName:
          "business-report.json",

        format:
          BUSINESS_REPORT_FORMATS.JSON,

        attachment:
          false,
      });

    assert.equal(
      disposition,
      'inline; filename="business-report.json"'
    );
  };


/**
 * =========================================================
 * SECURITY HEADERS
 * =========================================================
 */

const testJsonSecurityHeaders =
  () => {
    const headers =
      buildBusinessReportExportHeaders({
        format:
          BUSINESS_REPORT_FORMATS.JSON,
      });

    assert.equal(
      headers[
        "Content-Type"
      ],
      "application/json; charset=utf-8"
    );

    assert.equal(
      headers[
        "X-Content-Type-Options"
      ],
      "nosniff"
    );

    assert.equal(
      headers[
        "Cache-Control"
      ],
      "private, no-store, max-age=0"
    );

    assert.equal(
      headers.Pragma,
      "no-cache"
    );

    assert.equal(
      headers.Expires,
      "0"
    );

    assert.equal(
      headers[
        "Referrer-Policy"
      ],
      "no-referrer"
    );
  };


const testCsvSecurityHeaders =
  () => {
    const headers =
      buildBusinessReportExportHeaders({
        format:
          BUSINESS_REPORT_FORMATS.CSV,

        fileName:
          "report.csv",

        attachment:
          true,
      });

    assert.equal(
      headers[
        "Content-Type"
      ],
      "text/csv; charset=utf-8"
    );

    assert.equal(
      headers[
        "Content-Disposition"
      ],
      'attachment; filename="report.csv"'
    );

    assert.equal(
      headers[
        "X-Content-Type-Options"
      ],
      "nosniff"
    );

    assert.equal(
      headers[
        "Cache-Control"
      ],
      "private, no-store, max-age=0"
    );
  };


const testPdfReadySecurityHeaders =
  () => {
    const headers =
      buildBusinessReportExportHeaders({
        format:
          BUSINESS_REPORT_FORMATS
            .PDF_READY,
      });

    assert.equal(
      headers[
        "Content-Type"
      ],
      "application/json; charset=utf-8"
    );

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          headers,
          "Content-Disposition"
        ),
      false
    );
  };


const testNoDispositionWithoutAttachment =
  () => {
    const headers =
      buildBusinessReportExportHeaders({
        format:
          BUSINESS_REPORT_FORMATS.JSON,

        fileName:
          "report.json",

        attachment:
          false,
      });

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          headers,
          "Content-Disposition"
        ),
      false,
      "Content-Disposition should not be emitted unless attachment=true."
    );
  };


const testNoDispositionWithoutFileName =
  () => {
    const headers =
      buildBusinessReportExportHeaders({
        format:
          BUSINESS_REPORT_FORMATS.JSON,

        attachment:
          true,
      });

    assert.equal(
      Object.prototype
        .hasOwnProperty.call(
          headers,
          "Content-Disposition"
        ),
      false,
      "Content-Disposition should not be emitted without a filename."
    );
  };


/**
 * =========================================================
 * EXPRESS RESPONSE APPLICATION
 * =========================================================
 */

const testApplyHeaders = () => {
  let appliedHeaders =
    null;

  const mockResponse = {
    set(headers) {
      appliedHeaders =
        headers;

      return this;
    },
  };

  const returned =
    applyBusinessReportExportHeaders(
      mockResponse,
      {
        format:
          BUSINESS_REPORT_FORMATS.JSON,

        fileName:
          "report.json",

        attachment:
          true,
      }
    );

  assert.ok(
    appliedHeaders
  );

  assert.deepEqual(
    returned,
    appliedHeaders
  );

  assert.equal(
    appliedHeaders[
      "Content-Type"
    ],
    "application/json; charset=utf-8"
  );

  assert.equal(
    appliedHeaders[
      "Content-Disposition"
    ],
    'attachment; filename="report.json"'
  );
};


const testInvalidExpressResponse =
  () => {
    const invalidResponses = [
      null,
      undefined,
      {},
      {
        set:
          "not-a-function",
      },
    ];

    for (
      const response
      of invalidResponses
    ) {
      assert.throws(
        () =>
          applyBusinessReportExportHeaders(
            response,
            {
              format:
                BUSINESS_REPORT_FORMATS.JSON,
            }
          ),

        (error) => {
          assert.equal(
            error.code,
            "INVALID_REPORT_RESPONSE"
          );

          return true;
        }
      );
    }
  };


/**
 * =========================================================
 * RESPONSE CONFIG
 * =========================================================
 */

const testResponseConfig = () => {
  const config =
    buildBusinessReportExportResponseConfig({
      reportType:
        "BUSINESS_PERFORMANCE",

      format:
        BUSINESS_REPORT_FORMATS.CSV,

      generatedAt:
        "2026-10-01T10:30:00.000Z",

      suffix:
        "export",

      attachment:
        true,
    });

  assert.equal(
    config.format,
    "CSV"
  );

  assert.equal(
    config.mimeType,
    "text/csv; charset=utf-8"
  );

  assert.equal(
    config.extension,
    "csv"
  );

  assert.equal(
    config.fileName,
    "BUSINESS_PERFORMANCE-export-2026-10-01.csv"
  );

  assert.equal(
    config.attachment,
    true
  );

  assert.equal(
    config.headers[
      "Content-Type"
    ],
    config.mimeType
  );

  assert.equal(
    config.headers[
      "Content-Disposition"
    ],
    'attachment; filename="BUSINESS_PERFORMANCE-export-2026-10-01.csv"'
  );
};


/**
 * =========================================================
 * LONG / MALICIOUS COMPONENTS
 * =========================================================
 */

const testLongFileNameProtection =
  () => {
    const veryLongType =
      "A".repeat(
        1000
      );

    const veryLongSuffix =
      "B".repeat(
        1000
      );

    const fileName =
      buildSafeBusinessReportFileName({
        reportType:
          veryLongType,

        suffix:
          veryLongSuffix,

        format:
          BUSINESS_REPORT_FORMATS.JSON,

        generatedAt:
          "2026-10-01",
      });

    assert.ok(
      fileName.length <=
        225,
      "Generated filename should remain bounded."
    );

    assertSafeFileName(
      fileName
    );

    assert.equal(
      fileName.endsWith(
        ".json"
      ),
      true
    );
  };


const testUnsafeCharactersRemoved =
  () => {
    const fileName =
      buildSafeBusinessReportFileName({
        reportType:
          'report"; DROP TABLE users; --',

        suffix:
          "<script>alert(1)</script>",

        format:
          BUSINESS_REPORT_FORMATS.JSON,

        generatedAt:
          "2026-10-01",
      });

    assertSafeFileName(
      fileName
    );

    assert.equal(
      fileName.includes(
        "<"
      ),
      false
    );

    assert.equal(
      fileName.includes(
        ">"
      ),
      false
    );

    assert.equal(
      fileName.includes(
        ";"
      ),
      false
    );

    assert.equal(
      fileName.includes(
        '"'
      ),
      false
    );
  };


/**
 * =========================================================
 * SERVER-CONTROLLED MIME / EXTENSION
 * =========================================================
 */

const testServerControlsFormatMetadata =
  () => {
    const config =
      buildBusinessReportExportResponseConfig({
        reportType:
          "BUSINESS_INTELLIGENCE",

        format:
          BUSINESS_REPORT_FORMATS
            .PDF_READY,

        generatedAt:
          "2026-10-01",

        suffix:
          "report.pdf.exe",

        attachment:
          true,
      });

    assert.equal(
      config.mimeType,
      "application/json; charset=utf-8"
    );

    assert.equal(
      config.extension,
      "json"
    );

    assert.equal(
      config.fileName.endsWith(
        ".json"
      ),
      true
    );

    assert.equal(
      config.fileName.endsWith(
        ".pdf"
      ),
      false
    );

    assert.equal(
      config.fileName.endsWith(
        ".exe"
      ),
      false
    );
  };


/**
 * =========================================================
 * CAPABILITIES
 * =========================================================
 */

const testSecurityCapabilities =
  () => {
    const capabilities =
      getBusinessReportExportSecurityCapabilities();

    assert.equal(
      capabilities.safeFileNames,
      true
    );

    assert.equal(
      capabilities.serverControlledExtensions,
      true
    );

    assert.equal(
      capabilities.serverControlledMimeTypes,
      true
    );

    assert.equal(
      capabilities.contentTypeNosniff,
      true
    );

    assert.equal(
      capabilities.privateCaching,
      true
    );

    assert.equal(
      capabilities.noStore,
      true
    );

    assert.equal(
      capabilities.contentDisposition,
      true
    );

    assert.equal(
      capabilities.headerInjectionProtection,
      true
    );

    assert.equal(
      capabilities.pathTraversalProtection,
      true
    );

    assert.equal(
      capabilities.referrerProtection,
      true
    );

    assert.equal(
      capabilities.csvFormulaInjectionProtection,
      true
    );

    assert.equal(
      capabilities.binaryPdf,
      false
    );
  };


/**
 * =========================================================
 * IMMUTABILITY
 * =========================================================
 */

const testSecurityMappingsFrozen =
  () => {
    assert.equal(
      Object.isFrozen(
        BUSINESS_REPORT_EXPORT_MIME_TYPES
      ),
      true
    );

    assert.equal(
      Object.isFrozen(
        BUSINESS_REPORT_EXPORT_EXTENSIONS
      ),
      true
    );
  };


/**
 * =========================================================
 * RUN
 * =========================================================
 */

const run = async () => {
  console.log("");
  console.log(
    "============================================"
  );
  console.log(
    " Business Report Export Security Tests"
  );
  console.log(
    " 9.11.19.20.2"
  );
  console.log(
    "============================================"
  );
  console.log("");

  const tests = [
    [
      "Trusted MIME mappings are correct",
      testTrustedMimeTypes,
    ],

    [
      "Trusted extension mappings are correct",
      testTrustedExtensions,
    ],

    [
      "Unsupported formats fail closed",
      testUnsupportedFormatFailsClosed,
    ],

    [
      "Normal JSON filename is safe",
      testNormalFileName,
    ],

    [
      "CSV filename uses trusted extension",
      testCsvFileName,
    ],

    [
      "PDF_READY remains JSON",
      testPdfReadyFileName,
    ],

    [
      "Path traversal attempts are neutralized",
      testPathTraversalProtection,
    ],

    [
      "CRLF filename injection is neutralized",
      testCrLfInjectionProtection,
    ],

    [
      "Content-Disposition injection is neutralized",
      testContentDispositionInjectionProtection,
    ],

    [
      "Caller-controlled extensions are rejected",
      testExtensionSpoofingProtection,
    ],

    [
      "Attachment Content-Disposition is correct",
      testAttachmentDisposition,
    ],

    [
      "Inline Content-Disposition is correct",
      testInlineDisposition,
    ],

    [
      "JSON security headers are correct",
      testJsonSecurityHeaders,
    ],

    [
      "CSV security headers are correct",
      testCsvSecurityHeaders,
    ],

    [
      "PDF_READY security headers are JSON-safe",
      testPdfReadySecurityHeaders,
    ],

    [
      "No Content-Disposition for inline response",
      testNoDispositionWithoutAttachment,
    ],

    [
      "No Content-Disposition without filename",
      testNoDispositionWithoutFileName,
    ],

    [
      "Headers apply to Express response",
      testApplyHeaders,
    ],

    [
      "Invalid Express response fails closed",
      testInvalidExpressResponse,
    ],

    [
      "Safe response config is internally consistent",
      testResponseConfig,
    ],

    [
      "Long filenames remain bounded",
      testLongFileNameProtection,
    ],

    [
      "Unsafe filename characters are removed",
      testUnsafeCharactersRemoved,
    ],

    [
      "Server controls MIME and extension metadata",
      testServerControlsFormatMetadata,
    ],

    [
      "Security capabilities match implementation",
      testSecurityCapabilities,
    ],

    [
      "Security mappings are immutable",
      testSecurityMappingsFrozen,
    ],
  ];

  const results = [];

  for (
    const [
      name,
      callback,
    ]
    of tests
  ) {
    results.push(
      await runTest(
        name,
        callback
      )
    );
  }

  const passed =
    results.filter(
      (result) =>
        result.passed
    ).length;

  const failed =
    results.length -
    passed;

  console.log("");
  console.log(
    "============================================"
  );
  console.log(
    " TEST SUMMARY"
  );
  console.log(
    "============================================"
  );

  console.log(
    `Passed: ${passed}`
  );

  console.log(
    `Failed: ${failed}`
  );

  console.log(
    `Total:  ${results.length}`
  );

  console.log(
    "============================================"
  );
  console.log("");

  if (failed > 0) {
    process.exitCode = 1;

    throw new Error(
      `${failed} business report export security test(s) failed.`
    );
  }

  console.log(
    "✅ 9.11.19.20.2 Business Report Export Security verification passed."
  );
};


run().catch((error) => {
  console.error("");
  console.error(
    "Business report export security verification failed."
  );

  console.error(
    error
  );

  process.exitCode = 1;
});