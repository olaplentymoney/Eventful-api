import { Response } from 'express';
import { ApiResponse, PaginatedResponse, PaginationMeta } from '../types';

export function successResponse<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
): void {
  const body: ApiResponse<T> = { success: true, message, data };
  res.status(statusCode).json(body);
}

export function createdResponse<T>(res: Response, data: T, message = 'Created'): void {
  successResponse(res, data, message, 201);
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = 'Success',
): void {
  const body: PaginatedResponse<T> & { success: boolean; message: string } = {
    success: true,
    message,
    data,
    meta,
  };
  res.status(200).json(body);
}

export function noContentResponse(res: Response): void {
  res.status(204).send();
}
