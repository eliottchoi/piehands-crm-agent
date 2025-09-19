import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/axios';

// Fetch unique event names for a workspace
const getEventNames = async (workspaceId: string): Promise<string[]> => {
  const response = await apiClient.get(`/events/names`, {
    params: { workspaceId },
  });
  return response.data.eventNames || [];
};

export const useEventNames = (workspaceId: string) => {
  return useQuery<string[], Error>({
    queryKey: ['event-names', workspaceId],
    queryFn: () => getEventNames(workspaceId),
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // 2분 동안 캐시 유지 (이벤트 이름은 자주 바뀌지 않음)
  });
};
