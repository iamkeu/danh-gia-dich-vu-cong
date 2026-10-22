import { followOA, getUserID, getUserInfo } from 'zmp-sdk';

export type CitizenIdentity = {
  appUid: string;
  oaUid: string;
  followedOA: boolean;
};

export const OA_ID = String(import.meta.env.VITE_ZALO_OA_ID || '');

export async function readCitizenIdentity(): Promise<CitizenIdentity | null> {
  const appUid = await getUserID({});
  const response = await getUserInfo({ autoRequestPermission: false });
  const user = response.userInfo;
  if (!user?.idByOA) return null;
  return {
    appUid: String(appUid || user.id || ''),
    oaUid: String(user.idByOA),
    followedOA: Boolean(user.followedOA),
  };
}

export async function requestFollowOA(): Promise<CitizenIdentity | null> {
  if (!OA_ID) throw new Error('Mini App chưa được cấu hình OA ID.');
  await followOA({ id: OA_ID });
  // Zalo returns the OA identity after the follow confirmation is completed.
  return readCitizenIdentity();
}
