#!/bin/bash
# Script to run Prisma migrations on Render
# This can be run via Render Shell or as a one-time job

cd backend
pnpm migrate:deploy
