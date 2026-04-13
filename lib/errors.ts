import { NextResponse } from "next/server";
import { ZodError } from "zod";

// ---------------------------------------------------------------------------
// Types d'erreurs métier
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} introuvable`, 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Non autorisé") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Accès refusé") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly issues?: ZodError["issues"]
  ) {
    super("VALIDATION_ERROR", message, 400);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

// ---------------------------------------------------------------------------
// Handler API routes — transforme une erreur en réponse JSON structurée
// ---------------------------------------------------------------------------

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    issues?: ZodError["issues"];
  };
};

export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Données invalides",
          issues: error.issues,
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode }
    );
  }

  console.error("[API Error]", error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Une erreur interne est survenue",
      },
    },
    { status: 500 }
  );
}
