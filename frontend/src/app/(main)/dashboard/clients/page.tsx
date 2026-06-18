"use client";

import { ClientsManageClient } from "./_components/clients-manage-client";

export default function Page() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <ClientsManageClient />
    </div>
  );
}
