import { useMutation } from "@tanstack/react-query";

import { deleteJobById } from "@/actions/job";

export default function useDeleteJob() {
  const mutation = useMutation({
    mutationFn: async (id: number) => deleteJobById(id),
  });
  return mutation;
}
