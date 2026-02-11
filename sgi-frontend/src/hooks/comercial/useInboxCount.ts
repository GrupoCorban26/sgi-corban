import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import Cookies from 'js-cookie';

export function useInboxCount() {
    return useQuery({
        queryKey: ['inbox', 'count'],
        queryFn: async () => {
            // Check role from cookie
            let isJefa = false;
            try {
                const userDataStr = Cookies.get('user_data');
                if (userDataStr) {
                    const userData = JSON.parse(userDataStr);
                    // Check if roles array contains JEFE_COMERCIAL (backend role name)
                    // Config/navLateral mapping says 'JEFE_COMERCIAL' -> 'jefa_comercial'
                    // We check against backend role name usually, but let's check both to be safe
                    if (userData.roles.includes('JEFE_COMERCIAL')) {
                        isJefa = true;
                    }
                }
            } catch (e) { console.error(e); }

            const endpoint = isJefa ? '/comercial/inbox/count-all' : '/comercial/inbox/count';
            const { data } = await axios.get<number>(endpoint);
            return data;
        },
        refetchInterval: 60000, // Check every minute
        staleTime: 30000,
    });
}
