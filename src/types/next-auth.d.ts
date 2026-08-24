import "next-auth";
import "next-auth/jwt";

import type { GlobalRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string | null;
      email: string | null;
      image?: string | null;
      role: GlobalRole;
    };
  }

  interface User {
    role?: GlobalRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: GlobalRole;
  }
}
