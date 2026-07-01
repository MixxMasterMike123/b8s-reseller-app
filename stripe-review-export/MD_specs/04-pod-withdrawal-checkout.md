# 04 — Print-on-Demand / right-of-withdrawal at checkout

**Priority:** P1 (consumer law)
**Status:** ✅ Specified — verify against acceptance criteria.

## Purpose
Handle the consumer right of withdrawal (ångerrätt) correctly per Swedish law. Print-on-Demand
does **not** automatically remove the right of withdrawal: per Konsumentverket, if the buyer only
picks from the shop's standard options (size, colour, the shop's design), the 14-day withdrawal
right applies even though the item is printed on order. It is excluded only when the buyer adds
their **own** specification (own image/text or own measurements). Checkout must reflect both cases.

## Requirements
1. In the product/checkout model, distinguish:
   - **personalized** — buyer supplies own image/text/measurements → withdrawal can be excluded;
   - **standard-options** — buyer only picks preset size/colour or the shop's design → withdrawal
     applies.
2. **Personalized:** show a clear "no right of withdrawal — made to order" notice at checkout and
   require an explicit **checkbox** before payment. Persist proof on the order: timestamp, the
   exact notice text/version shown, and the acceptance.
3. **Standard-options:** ensure a normal 14-day withdrawal/return path exists; do **not** show the
   no-withdrawal notice.
4. Add a **size-guide** field/component for size-dependent products (a correct size guide is what
   defends against "wrong size" complaints; the delivered product must match it).

## Acceptance criteria
- [ ] Products are typed personalized vs standard-options.
- [ ] Personalized checkout shows the notice + mandatory checkbox; payment is blocked until ticked.
- [ ] Acceptance proof (timestamp + notice version + accepted) is stored on the order.
- [ ] Standard-options checkout does NOT show the notice and supports a 14-day return path.
- [ ] Size-guide field/component exists for size-dependent products.

## Out of scope / depends on
- Who bears the production cost on a withdrawal (seller vs platform vs printer) is contractual,
  not code — handled in the contracts. This spec only covers the checkout/consumer-facing flow.
