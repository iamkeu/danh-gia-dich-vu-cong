declare module 'zmp-sdk' {
  export function getUserID(options?: Record<string, unknown>): Promise<string>;
  export function getUserInfo(options?: Record<string, unknown>): Promise<{
    userInfo?: {
      id?: string;
      idByOA?: string;
      followedOA?: boolean;
      name?: string;
      avatar?: string;
    };
  }>;
  export function followOA(options: { id: string }): Promise<void>;
}
