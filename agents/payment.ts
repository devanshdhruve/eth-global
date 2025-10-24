import { TransferTransaction, Hbar } from "@hashgraph/sdk";
import { client } from "../hedera/hcs/topics";

export class PaymentAgent {
  constructor(private topicIds: { [key: string]: string }) {}

  async payAnnotator(annotatorAccountId: string, amountHbar: number, taskId: string) {
    const tx = await new TransferTransaction()
      .addHbarTransfer(client.operatorAccountId!, Hbar.fromTinybars(-amountHbar * 100_000_000)) // deduct from operator
      .addHbarTransfer(annotatorAccountId, Hbar.fromTinybars(amountHbar * 100_000_000))
      .execute(client);

    await tx.getReceipt(client);

    console.log(`[PaymentAgent] Paid ${amountHbar} HBAR to ${annotatorAccountId} for task ${taskId}`);
  }
}
