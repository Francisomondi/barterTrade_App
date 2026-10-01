import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";


/**
 * =========================================================
 * 9.11.19.20.6
 * BUSINESS REPORT CONTROLLER / HTTP TESTS
 * =========================================================
 *
 * IMPORTANT:
 *
 * - No real Prisma calls
 * - No real analytics calls
 * - No real entitlement lookup
 * - No real serializer work
 *
 * This suite verifies the HTTP/controller boundary only.
 * =========================================================
 */


/**
 * =========================================================
 * MOCK STATE
 * =========================================================
 */

const mocks = vi.hoisted(() => ({
  findUnique:
    vi.fn(),

  resolveAccess:
    vi.fn(),

  getEntitlement:
    vi.fn(),

  generateReport:
    vi.fn(),

  generateJson:
    vi.fn(),

  generateCsv:
    vi.fn(),

  generatePdfReady:
    vi.fn(),

  applyHeaders:
    vi.fn(),

  buildFileName:
    vi.fn(),
}));


/**
 * =========================================================
 * MODULE MOCKS
 * =========================================================
 */

vi.mock(
  "../config/prisma.js",
  () => ({
    default: {
      businessProfile: {
        findUnique:
          mocks.findUnique,
      },
    },
  })
);


vi.mock(
  "../services/businessReportAccessService.js",
  () => ({
    resolveBusinessReportAccess:
      mocks.resolveAccess,

    getBusinessReportEntitlement:
      mocks.getEntitlement,
  })
);


vi.mock(
  "../services/businessReportService.js",
  () => ({
    generateBusinessReport:
      mocks.generateReport,
  })
);


vi.mock(
  "../services/businessReportJsonService.js",
  () => ({
    generateBusinessReportJsonExport:
      mocks.generateJson,
  })
);


vi.mock(
  "../services/businessReportCsvService.js",
  () => ({
    generateBusinessReportCsvExport:
      mocks.generateCsv,
  })
);


vi.mock(
  "../services/businessReportPdfReadyService.js",
  () => ({
    generateBusinessReportPdfReadyData:
      mocks.generatePdfReady,
  })
);


vi.mock(
  "../services/businessReportExportSecurityService.js",
  () => ({
    applyBusinessReportExportHeaders:
      mocks.applyHeaders,

    buildSafeBusinessReportFileName:
      mocks.buildFileName,
  })
);


/**
 * Import AFTER mocks are registered.
 */

const {
  generateMyBusinessReport,
  getMyBusinessReportAccess,
} =
  await import(
    "../controllers/businessReportController.js"
  );


/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const REPORT_TYPE =
  "BUSINESS_INTELLIGENCE";

const GENERATED_AT =
  "2026-10-01T09:30:00.000Z";

const REPORT_ID =
  "report-http-test-001";


/**
 * =========================================================
 * FIXTURES
 * =========================================================
 */

const createBusiness = () => ({
  id:
    "business-1",

  userId:
    "user-1",

  businessName:
    "Francis Test Store",

  slug:
    "francis-test-store",

  category:
    "FURNITURE",

  logo:
    null,

  coverImage:
    null,

  status:
    "ACTIVE",

  verificationStatus:
    "VERIFIED",

  createdAt:
    new Date(
      "2026-01-01T00:00:00.000Z"
    ),

  updatedAt:
    new Date(
      "2026-10-01T00:00:00.000Z"
    ),
});


const createCanonicalReport = () => ({
  reportId:
    REPORT_ID,

  reportType:
    REPORT_TYPE,

  generatedAt:
    GENERATED_AT,

  metadata: {
    reportId:
      REPORT_ID,
  },

  sections: [],
});


const createAllowedAccess = () => ({
  allowed:
    true,

  reportType:
    REPORT_TYPE,

  access: {
    analyticsTier:
      "BUSINESS_PRO",
  },

  definition: {
    supportedFormats: [
      "JSON",
      "CSV",
      "PDF_READY",
    ],
  },
});


/**
 * =========================================================
 * EXPRESS-LIKE RESPONSE MOCK
 * =========================================================
 */

const createResponse = () => {
  const res = {
    statusCode:
      200,

    body:
      undefined,

    headers:
      {},

    status:
      vi.fn(),

    json:
      vi.fn(),

    set:
      vi.fn(),
  };

  res.status.mockImplementation(
    (statusCode) => {
      res.statusCode =
        statusCode;

      return res;
    }
  );

  res.json.mockImplementation(
    (body) => {
      res.body =
        body;

      return res;
    }
  );

  res.set.mockImplementation(
    (headers) => {
      Object.assign(
        res.headers,
        headers
      );

      return res;
    }
  );

  return res;
};


const createRequest = ({
  authenticated = true,
  reportType = REPORT_TYPE,
  query = {},
} = {}) => ({
  user:
    authenticated
      ? {
          id:
            "user-1",
        }
      : undefined,

  params: {
    reportType,
  },

  query,

  body: {},
});


/**
 * =========================================================
 * DEFAULT MOCK BEHAVIOUR
 * =========================================================
 */

const configureSuccessfulMocks =
  () => {
    mocks.findUnique.mockResolvedValue(
      createBusiness()
    );

    mocks.resolveAccess.mockResolvedValue(
      createAllowedAccess()
    );

    mocks.getEntitlement.mockResolvedValue({
      allowed:
        true,

      tier:
        "BUSINESS_PRO",
    });

    mocks.generateReport.mockResolvedValue(
      createCanonicalReport()
    );

    mocks.buildFileName.mockReturnValue(
      "business-intelligence-2026-10-01.json"
    );

    mocks.applyHeaders.mockReturnValue({
      "Content-Type":
        "application/json; charset=utf-8",
    });

    mocks.generateJson.mockReturnValue({
      format:
        "JSON",

      reportId:
        REPORT_ID,

      reportType:
        REPORT_TYPE,

      exportedAt:
        GENERATED_AT,

      sourceGeneratedAt:
        GENERATED_AT,

      mimeType:
        "application/json; charset=utf-8",

      extension:
        "json",

      byteLength:
        100,

      payload: {
        export: {
          reportId:
            REPORT_ID,
        },

        report:
          createCanonicalReport(),
      },
    });

    mocks.generateCsv.mockReturnValue({
      format:
        "CSV",

      reportId:
        REPORT_ID,

      reportType:
        REPORT_TYPE,

      generatedAt:
        GENERATED_AT,

      sourceGeneratedAt:
        GENERATED_AT,

      mimeType:
        "text/csv; charset=utf-8",

      mode:
        "MULTI_DATASET",

      datasetCount:
        2,

      totalRows:
        10,

      maxRows:
        10000,

      maxDatasetRows:
        5000,

      truncated:
        false,

      datasets: [
        {
          name:
            "report-metadata",

          rows: [
            {
              reportId:
                REPORT_ID,
            },
          ],
        },

        {
          name:
            "listing-performance-toplistings",

          rows: [],
        },
      ],
    });

    mocks.generatePdfReady.mockReturnValue({
      format:
        "PDF_READY",

      reportId:
        REPORT_ID,

      reportType:
        REPORT_TYPE,

      binaryPdf:
        false,

      sections: [],

      largeExportProtection: {
        maxSections:
          25,

        maxRowsPerTable:
          5000,

        maxTotalTableRows:
          10000,

        sourceTableRowCount:
          0,

        renderedTableRowCount:
          0,

        truncated:
          false,
      },
    });
  };


beforeEach(() => {
  vi.clearAllMocks();

  configureSuccessfulMocks();
});


/**
 * =========================================================
 * AUTHENTICATION / OWNERSHIP
 * =========================================================
 */

describe(
  "Business report controller — authentication and ownership",
  () => {
    it(
      "returns 401 when authentication is missing",
      async () => {
        const req =
          createRequest({
            authenticated:
              false,
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(401);

        expect(
          res.body
        ).toMatchObject({
          success:
            false,

          code:
            "AUTHENTICATION_REQUIRED",
        });

        expect(
          mocks.findUnique
        ).not.toHaveBeenCalled();

        expect(
          mocks.resolveAccess
        ).not.toHaveBeenCalled();

        expect(
          mocks.generateReport
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "resolves business ownership only from req.user.id",
      async () => {
        const req =
          createRequest({
            query: {
              businessId:
                "attacker-business",

              userId:
                "attacker-user",

              isBusinessPro:
                "true",

              analyticsTier:
                "BUSINESS_PRO",

              plan:
                "BUSINESS_PRO",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          mocks.findUnique
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              userId:
                "user-1",
            },
          })
        );
      }
    );


    it(
      "returns 404 when authenticated owner has no business",
      async () => {
        mocks.findUnique.mockResolvedValue(
          null
        );

        const req =
          createRequest();

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(404);

        expect(
          res.body
        ).toMatchObject({
          success:
            false,

          code:
            "BUSINESS_REQUIRED",
        });

        expect(
          mocks.resolveAccess
        ).not.toHaveBeenCalled();

        expect(
          mocks.generateReport
        ).not.toHaveBeenCalled();
      }
    );
  }
);


/**
 * =========================================================
 * REPORT TYPE / FORMAT
 * =========================================================
 */

describe(
  "Business report controller — request validation",
  () => {
    it(
      "returns 400 for unsupported report type",
      async () => {
        const req =
          createRequest({
            reportType:
              "NOT_A_REPORT",
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(400);

        expect(
          res.body.code
        ).toBe(
          "UNSUPPORTED_REPORT_TYPE"
        );

        expect(
          mocks.resolveAccess
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "returns 400 for unsupported format",
      async () => {
        const req =
          createRequest({
            query: {
              format:
                "XML",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(400);

        expect(
          res.body.code
        ).toBe(
          "UNSUPPORTED_REPORT_FORMAT"
        );

        expect(
          res.body.supportedFormats
        ).toEqual([
          "JSON",
          "CSV",
          "PDF_READY",
        ]);

        expect(
          mocks.generateReport
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "uses JSON as default format",
      async () => {
        const req =
          createRequest();

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          mocks.generateReport
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            format:
              "JSON",
          })
        );

        expect(
          mocks.generateJson
        ).toHaveBeenCalledTimes(1);
      }
    );


    it(
      "returns 400 when format is not supported by selected report",
      async () => {
        mocks.resolveAccess.mockResolvedValue({
          ...createAllowedAccess(),

          definition: {
            supportedFormats: [
              "JSON",
            ],
          },
        });

        const req =
          createRequest({
            query: {
              format:
                "CSV",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(400);

        expect(
          res.body
        ).toMatchObject({
          success:
            false,

          code:
            "REPORT_FORMAT_NOT_SUPPORTED",

          requestedFormat:
            "CSV",

          supportedFormats: [
            "JSON",
          ],
        });

        expect(
          mocks.generateReport
        ).not.toHaveBeenCalled();
      }
    );
  }
);


/**
 * =========================================================
 * BUSINESS PRO
 * =========================================================
 */

describe(
  "Business report controller — Business Pro enforcement",
  () => {
    it(
      "returns 403 when Business Pro is required",
      async () => {
        mocks.resolveAccess.mockResolvedValue({
          allowed:
            false,

          code:
            "BUSINESS_PRO_REQUIRED",

          message:
            "Business Pro is required.",

          reportType:
            REPORT_TYPE,

          access: {
            tier:
              "BUSINESS_FREE",
          },

          preview: {
            available:
              true,
          },

          upgrade: {
            required:
              true,
          },
        });

        const req =
          createRequest();

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(403);

        expect(
          res.body.code
        ).toBe(
          "BUSINESS_PRO_REQUIRED"
        );

        expect(
          res.body.dataExposed
        ).toBe(false);

        expect(
          mocks.generateReport
        ).not.toHaveBeenCalled();

        expect(
          mocks.generateJson
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "returns 403 for entitlement mismatch",
      async () => {
        mocks.resolveAccess.mockResolvedValue({
          allowed:
            false,

          code:
            "BUSINESS_ENTITLEMENT_MISMATCH",

          message:
            "Business entitlement mismatch.",
        });

        const req =
          createRequest();

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(403);

        expect(
          res.body.code
        ).toBe(
          "BUSINESS_ENTITLEMENT_MISMATCH"
        );

        expect(
          mocks.generateReport
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "ignores client supplied Business Pro flags",
      async () => {
        mocks.resolveAccess.mockResolvedValue({
          allowed:
            false,

          code:
            "BUSINESS_PRO_REQUIRED",

          message:
            "Business Pro is required.",
        });

        const req =
          createRequest({
            query: {
              isBusinessPro:
                "true",

              analyticsTier:
                "BUSINESS_PRO",

              plan:
                "BUSINESS_PRO",

              subscriptionId:
                "fake-subscription",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(403);

        expect(
          mocks.resolveAccess
        ).toHaveBeenCalledWith({
          userId:
            "user-1",

          business:
            expect.objectContaining({
              userId:
                "user-1",
            }),

          reportType:
            REPORT_TYPE,
        });

        expect(
          mocks.generateReport
        ).not.toHaveBeenCalled();
      }
    );
  }
);


/**
 * =========================================================
 * REPORT RANGE
 * =========================================================
 */

describe(
  "Business report controller — report ranges",
  () => {
    it(
      "passes valid rolling days to canonical report service",
      async () => {
        const req =
          createRequest({
            query: {
              days:
                "90",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          mocks.generateReport
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            days:
              90,

            startDate:
              null,

            endDate:
              null,
          })
        );
      }
    );


    it(
      "rejects invalid rolling days",
      async () => {
        const req =
          createRequest({
            query: {
              days:
                "-5",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(400);

        expect(
          res.body.code
        ).toBe(
          "INVALID_REPORT_DAYS"
        );

        expect(
          mocks.generateReport
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "rejects history above maximum",
      async () => {
        const req =
          createRequest({
            query: {
              days:
                "366",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(400);

        expect(
          res.body.code
        ).toBe(
          "REPORT_RANGE_TOO_LARGE"
        );
      }
    );


    it(
      "rejects incomplete custom range",
      async () => {
        const req =
          createRequest({
            query: {
              startDate:
                "2026-09-01",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(400);

        expect(
          res.body.code
        ).toBe(
          "INVALID_REPORT_RANGE"
        );
      }
    );


    it(
      "rejects days mixed with custom dates",
      async () => {
        const req =
          createRequest({
            query: {
              days:
                "30",

              startDate:
                "2026-09-01",

              endDate:
                "2026-09-30",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(400);

        expect(
          res.body.code
        ).toBe(
          "INVALID_REPORT_RANGE"
        );
      }
    );


    it(
      "rejects reversed custom dates",
      async () => {
        const req =
          createRequest({
            query: {
              startDate:
                "2026-09-30",

              endDate:
                "2026-09-01",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(400);

        expect(
          res.body.code
        ).toBe(
          "INVALID_REPORT_RANGE"
        );
      }
    );


    it(
      "passes valid custom dates to canonical report service",
      async () => {
        const req =
          createRequest({
            query: {
              startDate:
                "2026-09-01",

              endDate:
                "2026-09-30",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        const call =
          mocks.generateReport.mock
            .calls[0][0];

        expect(
          call.days
        ).toBe(30);

        expect(
          call.startDate
        ).toBeInstanceOf(Date);

        expect(
          call.endDate
        ).toBeInstanceOf(Date);

        expect(
          call.startDate
            .toISOString()
        ).toBe(
          "2026-09-01T00:00:00.000Z"
        );

        expect(
          call.endDate
            .toISOString()
        ).toBe(
          "2026-09-30T00:00:00.000Z"
        );
      }
    );
  }
);


/**
 * =========================================================
 * CANONICAL REPORT DISPATCH
 * =========================================================
 */

describe(
  "Business report controller — canonical report dispatch",
  () => {
    it(
      "passes owner business and server resolved analytics tier",
      async () => {
        const req =
          createRequest();

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          mocks.generateReport
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            business:
              expect.objectContaining({
                id:
                  "business-1",

                userId:
                  "user-1",
              }),

            reportType:
              REPORT_TYPE,

            analyticsTier:
              "BUSINESS_PRO",

            timezone:
              "UTC",
          })
        );
      }
    );


    it(
      "generates canonical report only once",
      async () => {
        const req =
          createRequest();

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          mocks.generateReport
        ).toHaveBeenCalledTimes(1);
      }
    );
  }
);


/**
 * =========================================================
 * JSON HTTP RESPONSE
 * =========================================================
 */

describe(
  "Business report controller — JSON response",
  () => {
    it(
      "dispatches JSON serializer",
      async () => {
        const report =
          createCanonicalReport();

        mocks.generateReport.mockResolvedValue(
          report
        );

        const req =
          createRequest({
            query: {
              format:
                "JSON",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          mocks.generateJson
        ).toHaveBeenCalledWith({
          report,
        });

        expect(
          mocks.generateCsv
        ).not.toHaveBeenCalled();

        expect(
          mocks.generatePdfReady
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "returns successful JSON API envelope",
      async () => {
        const req =
          createRequest({
            query: {
              format:
                "JSON",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(200);

        expect(
          res.body.success
        ).toBe(true);

        expect(
          res.body.export
        ).toMatchObject({
          format:
            "JSON",

          reportId:
            REPORT_ID,

          reportType:
            REPORT_TYPE,

          mimeType:
            "application/json; charset=utf-8",

          extension:
            "json",

          byteLength:
            100,
        });

        expect(
          res.body.data
        ).toBeDefined();
      }
    );


    it(
      "applies JSON export security headers without attachment",
      async () => {
        const req =
          createRequest({
            query: {
              format:
                "JSON",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          mocks.applyHeaders
        ).toHaveBeenCalledWith(
          res,
          expect.objectContaining({
            format:
              "JSON",

            attachment:
              false,
          })
        );
      }
    );
  }
);


/**
 * =========================================================
 * CSV HTTP RESPONSE
 * =========================================================
 */

describe(
  "Business report controller — CSV response",
  () => {
    it(
      "dispatches CSV serializer",
      async () => {
        const report =
          createCanonicalReport();

        mocks.generateReport.mockResolvedValue(
          report
        );

        const req =
          createRequest({
            query: {
              format:
                "CSV",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          mocks.generateCsv
        ).toHaveBeenCalledWith({
          report,
        });

        expect(
          mocks.generateJson
        ).not.toHaveBeenCalled();

        expect(
          mocks.generatePdfReady
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "returns CSV datasets inside JSON API envelope",
      async () => {
        const req =
          createRequest({
            query: {
              format:
                "CSV",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(200);

        expect(
          res.body.success
        ).toBe(true);

        expect(
          res.body.export
        ).toMatchObject({
          format:
            "CSV",

          mimeType:
            "text/csv; charset=utf-8",

          mode:
            "MULTI_DATASET",

          datasetCount:
            2,

          totalRows:
            10,

          maxRows:
            10000,

          maxDatasetRows:
            5000,

          truncated:
            false,
        });

        expect(
          Array.isArray(
            res.body.datasets
          )
        ).toBe(true);
      }
    );


    it(
      "uses JSON HTTP security headers for CSV envelope",
      async () => {
        const req =
          createRequest({
            query: {
              format:
                "CSV",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          mocks.applyHeaders
        ).toHaveBeenCalledWith(
          res,
          expect.objectContaining({
            format:
              "JSON",

            attachment:
              false,
          })
        );
      }
    );
  }
);


/**
 * =========================================================
 * PDF_READY HTTP RESPONSE
 * =========================================================
 */

describe(
  "Business report controller — PDF_READY response",
  () => {
    it(
      "dispatches PDF_READY serializer",
      async () => {
        const report =
          createCanonicalReport();

        mocks.generateReport.mockResolvedValue(
          report
        );

        const req =
          createRequest({
            query: {
              format:
                "PDF_READY",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          mocks.generatePdfReady
        ).toHaveBeenCalledWith({
          report,
        });

        expect(
          mocks.generateJson
        ).not.toHaveBeenCalled();

        expect(
          mocks.generateCsv
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "returns PDF_READY as structured JSON rather than binary PDF",
      async () => {
        const req =
          createRequest({
            query: {
              format:
                "PDF_READY",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(200);

        expect(
          res.body.export
        ).toMatchObject({
          format:
            "PDF_READY",

          reportId:
            REPORT_ID,

          reportType:
            REPORT_TYPE,

          mimeType:
            "application/json; charset=utf-8",

          extension:
            "json",

          binaryPdf:
            false,
        });

        expect(
          res.body.data.binaryPdf
        ).toBe(false);
      }
    );


    it(
      "applies PDF_READY security headers without attachment",
      async () => {
        const req =
          createRequest({
            query: {
              format:
                "PDF_READY",
            },
          });

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          mocks.applyHeaders
        ).toHaveBeenCalledWith(
          res,
          expect.objectContaining({
            format:
              "PDF_READY",

            attachment:
              false,
          })
        );
      }
    );
  }
);


/**
 * =========================================================
 * ERROR MAPPING
 * =========================================================
 */

describe(
  "Business report controller — error mapping",
  () => {
    const cases = [
      [
        "BUSINESS_REPORT_JSON_DEPTH_EXCEEDED",
        413,
      ],

      [
        "BUSINESS_REPORT_JSON_TOO_LARGE",
        413,
      ],

      [
        "BUSINESS_REPORT_TOO_MANY_SECTIONS",
        413,
      ],

      [
        "INVALID_REPORT_RANGE",
        400,
      ],

      [
        "INVALID_REPORT_DAYS",
        400,
      ],

      [
        "REPORT_RANGE_TOO_LARGE",
        400,
      ],
    ];


    for (
      const [
        code,
        expectedStatus,
      ]
      of cases
    ) {
      it(
        `maps ${code} to ${expectedStatus}`,
        async () => {
          const error =
            new Error(
              "Controlled report error."
            );

          error.code =
            code;

          error.details = {
            test:
              true,
          };

          mocks.generateReport.mockRejectedValue(
            error
          );

          const req =
            createRequest();

          const res =
            createResponse();

          await generateMyBusinessReport(
            req,
            res
          );

          expect(
            res.statusCode
          ).toBe(
            expectedStatus
          );

          expect(
            res.body.code
          ).toBe(code);

          expect(
            res.body.message
          ).toBe(
            "Controlled report error."
          );

          expect(
            res.body.details
          ).toEqual({
            test:
              true,
          });
        }
      );
    }


    it(
      "hides internal error details for unknown 500 errors",
      async () => {
        const error =
          new Error(
            "Database password leaked."
          );

        error.code =
          "UNKNOWN_INTERNAL_ERROR";

        error.details = {
          secret:
            "do-not-expose",
        };

        mocks.generateReport.mockRejectedValue(
          error
        );

        const req =
          createRequest();

        const res =
          createResponse();

        await generateMyBusinessReport(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(500);

        expect(
          res.body.success
        ).toBe(false);

        expect(
          res.body.message
        ).toBe(
          "Unable to generate business report."
        );

        expect(
          res.body.details
        ).toBeUndefined();

        expect(
          JSON.stringify(
            res.body
          )
        ).not.toContain(
          "Database password leaked"
        );
      }
    );
  }
);


/**
 * =========================================================
 * REPORT ACCESS ENDPOINT
 * =========================================================
 */

describe(
  "Business report controller — report access endpoint",
  () => {
    it(
      "returns 401 without authentication",
      async () => {
        const req =
          createRequest({
            authenticated:
              false,
          });

        const res =
          createResponse();

        await getMyBusinessReportAccess(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(401);

        expect(
          res.body.code
        ).toBe(
          "AUTHENTICATION_REQUIRED"
        );

        expect(
          mocks.getEntitlement
        ).not.toHaveBeenCalled();
      }
    );


    it(
      "returns 404 when business does not exist",
      async () => {
        mocks.findUnique.mockResolvedValue(
          null
        );

        const req =
          createRequest();

        const res =
          createResponse();

        await getMyBusinessReportAccess(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(404);

        expect(
          res.body.code
        ).toBe(
          "BUSINESS_REQUIRED"
        );
      }
    );


    it(
      "resolves report entitlement server-side",
      async () => {
        const req =
          createRequest();

        const res =
          createResponse();

        await getMyBusinessReportAccess(
          req,
          res
        );

        expect(
          mocks.getEntitlement
        ).toHaveBeenCalledWith({
          userId:
            "user-1",

          business:
            expect.objectContaining({
              id:
                "business-1",

              userId:
                "user-1",
            }),
        });
      }
    );


    it(
      "returns safe business metadata and report entitlement",
      async () => {
        const req =
          createRequest();

        const res =
          createResponse();

        await getMyBusinessReportAccess(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(200);

        expect(
          res.body.success
        ).toBe(true);

        expect(
          res.body.business
        ).toEqual({
          businessName:
            "Francis Test Store",

          slug:
            "francis-test-store",

          status:
            "ACTIVE",

          verificationStatus:
            "VERIFIED",
        });

        expect(
          res.body.business.id
        ).toBeUndefined();

        expect(
          res.body.business.userId
        ).toBeUndefined();

        expect(
          res.body.reports
        ).toEqual({
          allowed:
            true,

          tier:
            "BUSINESS_PRO",
        });
      }
    );


    it(
      "returns safe 500 response when entitlement lookup fails",
      async () => {
        mocks.getEntitlement.mockRejectedValue(
          new Error(
            "Internal entitlement failure"
          )
        );

        const req =
          createRequest();

        const res =
          createResponse();

        await getMyBusinessReportAccess(
          req,
          res
        );

        expect(
          res.statusCode
        ).toBe(500);

        expect(
          res.body
        ).toEqual({
          success:
            false,

          code:
            "BUSINESS_REPORT_ACCESS_FAILED",

          message:
            "Unable to load business report access.",
        });
      }
    );
  }
);