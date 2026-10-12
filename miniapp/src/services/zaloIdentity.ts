import { getUserID, getUserInfo } from 'zmp-sdk';

export type CitizenIdentity = {
  appUid: string;
  oaUid: string;
  followedOA?: boolean;
};

export async function readCitizenIdentity(): Promise<CitizenIdentity> {
  const appUid = await getUserID({});
  const response = await getUserInfo({ autoRequestPermission: false });
  const user = response.userInfo;

  if (!user?.idByOA) {
    throw new Error('Chưa nhận được idByOA. Hãy xác thực Mini App với OA và bảo đảm tài khoản đã quan tâm OA.');
  }

  return {
    appUid: String(appUid || user.id || ''),
    oaUid: String(user.idByOA),
    followedOA: user.followedOA,
  };
}
