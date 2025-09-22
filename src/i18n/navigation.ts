import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Create locale-aware navigation APIs
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);