
import {
  BUSINESS_REPORT_FORMATS,
} from "../config/businessReportConfig.js";


export const BUSINESS_REPORT_EXPORT_MIME_TYPES =
  Object.freeze({
    [BUSINESS_REPORT_FORMATS.JSON]:
      "application/json; charset=utf-8",

    [BUSINESS_REPORT_FORMATS.CSV]:
      "text/csv; charset=utf-8",

    [BUSINESS_REPORT_FORMATS.PDF_READY]:
      "application/json; charset=utf-8",
  });



export const BUSINESS_REPORT_EXPORT_EXTENSIONS =
  Object.freeze({
    [BUSINESS_REPORT_FORMATS.JSON]:
      "json",

    [BUSINESS_REPORT_FORMATS.CSV]:
      "csv",

    [BUSINESS_REPORT_FORMATS.PDF_READY]:
      "json",
  });


/**
 * =========================================================
 * ERROR HELPER
 * =========================================================
 */

const createExportSecurityError = (
  code,
  message,
  details = null
) => {
  const error =
    new Error(message);

  error.code =
    code;

  if (details) {
    error.details =
      details;
  }

  return error;
};


/**
 * =========================================================
 * FORMAT VALIDATION
 * =========================================================
 */

const getSafeExportFormatConfig = (
  format
) => {
  const mimeType =
    BUSINESS_REPORT_EXPORT_MIME_TYPES[
      format
    ];

  const extension =
    BUSINESS_REPORT_EXPORT_EXTENSIONS[
      format
    ];

  if (
    !mimeType ||
    !extension
  ) {
    throw createExportSecurityError(
      "UNSUPPORTED_REPORT_FORMAT",
      "Unsupported report export format.",
      {
        format:
          format || null,
      }
    );
  }

  return {
    mimeType,
    extension,
  };
};


const sanitizeFilePart = (
  value
) => {
  const normalized =
    String(
      value ??
      ""
    )
      .normalize("NFKD")

      .replace(
        /[\u0000-\u001F\u007F]/g,
        ""
      )

      /**
       * Remove path separators explicitly.
       */

      .replace(
        /[\\/]+/g,
        "-"
      )

    
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        "-"
      )

      /**
       * Collapse repeated separators.
       */

      .replace(
        /-{2,}/g,
        "-"
      )

      .replace(
        /_{2,}/g,
        "_"
      )

      /**
       * Remove leading/trailing separators.
       */

      .replace(
        /^[-_]+|[-_]+$/g,
        ""
      )

      /**
       * Keep individual filename components reasonably
       * small.
       */

      .slice(
        0,
        80
      );

  return (
    normalized ||
    "report"
  );
};


/**
 * =========================================================
 * SAFE DATE
 * =========================================================
 */

const getSafeExportDate = (
  generatedAt = null
) => {
  const fallback =
    new Date()
      .toISOString()
      .slice(
        0,
        10
      );

  if (!generatedAt) {
    return fallback;
  }

  const parsed =
    new Date(
      generatedAt
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return fallback;
  }

  return parsed
    .toISOString()
    .slice(
      0,
      10
    );
};


/**
 * =========================================================
 * SAFE FILENAME
 * =========================================================
 */

export const buildSafeBusinessReportFileName =
  ({
    reportType,
    format,
    generatedAt = null,
    suffix = null,
  } = {}) => {
    const {
      extension,
    } =
      getSafeExportFormatConfig(
        format
      );

    const date =
      getSafeExportDate(
        generatedAt
      );

    const parts = [
      sanitizeFilePart(
        reportType ||
        "business-report"
      ),
    ];

    if (suffix) {
      parts.push(
        sanitizeFilePart(
          suffix
        )
      );
    }

    parts.push(
      date
    );

    const baseName =
      parts
        .filter(Boolean)
        .join("-")
        .slice(
          0,
          220
        )
        .replace(
          /[-_]+$/g,
          ""
        ) ||
      "business-report";

    return `${baseName}.${extension}`;
  };


/**
 * =========================================================
 * SAFE CONTENT-DISPOSITION
 * =========================================================
 */

export const buildSafeContentDisposition =
  ({
    fileName,
    format,
    attachment = true,
  } = {}) => {
    const {
      extension,
    } =
      getSafeExportFormatConfig(
        format
      );

    const rawFileName =
      String(
        fileName ||
        "business-report"
      );


    const withoutExtension =
      rawFileName.replace(
        /\.[^.]*$/,
        ""
      );

    const safeBaseName =
      sanitizeFilePart(
        withoutExtension
      );

    const finalFileName =
      `${safeBaseName}.${extension}`;

    const disposition =
      attachment
        ? "attachment"
        : "inline";

    return (
      `${disposition}; ` +
      `filename="${finalFileName}"`
    );
  };


/**
 * =========================================================
 * EXPORT HEADERS
 * =========================================================
 */

export const buildBusinessReportExportHeaders =
  ({
    format,
    fileName = null,
    attachment = false,
  } = {}) => {
    const {
      mimeType,
    } =
      getSafeExportFormatConfig(
        format
      );

    const headers = {
      "Content-Type":
        mimeType,

      "X-Content-Type-Options":
        "nosniff",

      "Cache-Control":
        "private, no-store, max-age=0",

      Pragma:
        "no-cache",

      Expires:
        "0",

      "Referrer-Policy":
        "no-referrer",
    };



    if (
      attachment &&
      fileName
    ) {
      headers[
        "Content-Disposition"
      ] =
        buildSafeContentDisposition({
          fileName,
          format,
          attachment: true,
        });
    }

    return headers;
  };


/**
 * =========================================================
 * APPLY HEADERS
 * =========================================================
 *
 * Applies the security headers to an Express response.
 */

export const applyBusinessReportExportHeaders =
  (
    res,
    {
      format,
      fileName = null,
      attachment = false,
    } = {}
  ) => {
    if (
      !res ||
      typeof res.set !==
        "function"
    ) {
      throw createExportSecurityError(
        "INVALID_REPORT_RESPONSE",
        "A valid Express response object is required."
      );
    }

    const headers =
      buildBusinessReportExportHeaders({
        format,
        fileName,
        attachment,
      });

    res.set(
      headers
    );

    return headers;
  };


/**
 * =========================================================
 * SAFE EXPORT RESPONSE CONFIG
 * =========================================================
 
 */

export const buildBusinessReportExportResponseConfig =
  ({
    reportType,
    format,
    generatedAt = null,
    suffix = null,
    attachment = false,
  } = {}) => {
    const {
      mimeType,
      extension,
    } =
      getSafeExportFormatConfig(
        format
      );

    const fileName =
      buildSafeBusinessReportFileName({
        reportType,
        format,
        generatedAt,
        suffix,
      });

    const headers =
      buildBusinessReportExportHeaders({
        format,
        fileName,
        attachment,
      });

    return {
      format,

      mimeType,

      extension,

      fileName,

      attachment:
        Boolean(
          attachment
        ),

      headers,
    };
  };


/**
 * =========================================================
 * SECURITY CAPABILITIES
 * =========================================================
 */

export const getBusinessReportExportSecurityCapabilities =
  () => ({
    safeFileNames:
      true,

    serverControlledExtensions:
      true,

    serverControlledMimeTypes:
      true,

    contentTypeNosniff:
      true,

    privateCaching:
      true,

    noStore:
      true,

    contentDisposition:
      true,

    headerInjectionProtection:
      true,

    pathTraversalProtection:
      true,

    referrerProtection:
      true,

   
    csvFormulaInjectionProtection:
      true,

    binaryPdf:
      false,
  });