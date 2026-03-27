import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export const validateRequest = (schema: ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      const parsedBody = schema.parse(req.body)
      req.body = parsedBody
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.errors
        })
      }
      next(error)
    }
  }
}
