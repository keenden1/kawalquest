export default function GameTopUpReturnPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <div className="max-w-lg rounded-2xl border border-amber-300/20 bg-white/5 p-8 text-center">
        <p className="eyebrow">Kawal Quest</p>
        <h1 className="mt-3 text-3xl font-black text-white">Return to your game</h1>
        <p className="mt-5 leading-7 text-stone-300">Close the payment window to return to Kawal Quest. Gold is added after your payment is confirmed. Closing this page does not confirm a payment.</p>
        <p className="mt-4 text-sm leading-6 text-stone-400">Sandbox purchases do not add Gold to your live account.</p>
      </div>
    </main>
  );
}
