import { describe, expect, it } from 'vitest';
import { messageEndpointForOAType } from '@/lib/zalo/client';

describe('Zalo OA message endpoint routing', () => {
  it('routes government OA type 4 to the v2 message API', () => {
    expect(messageEndpointForOAType(4)).toBe('https://openapi.zalo.me/v2.0/oa/message');
  });

  it('keeps v3 customer-service API for non-government OA types', () => {
    expect(messageEndpointForOAType(2)).toBe('https://openapi.zalo.me/v3.0/oa/message/cs');
  });
});
