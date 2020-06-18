<script>
  import { addDays, format as dateFormat } from "date-fns";
  import Dialog from "./Dialog.svelte";

  export let P_travel = 0;
  export let P_travelersinfected = 0;
  export let dailyVisitorArrivals = 0;
  export let dailyVisitorCensus = 0;

  let showDialog = false;

  const toggle = () => {
    showDialog = !showDialog;
  };

  const dialogText = `NOTE
  
This model assumes a static tourist population.  We do not model the transition of susceptible-exposed-infectious-recovered for travelers.  Instead, we assume that our tourist population is a fixed number, and some fraction of them are infectious.  In reality, we hope most of the infectious tourist population will be caught with airport screening, and that the "infectious" tourist population comes mainly from those that were exposed but asymptomatic at the time of arrival.  Therefore you should consider this "average infectious tourist volume" to encompass both:

- infectious tourists that slipped through screening

- tourists that were not infectious/detectable upon arrival but became infectious during their visit

Please consider this when using this model.
`;
</script>

<style>
  .TravelerInfo {
    color: #888;
    font-weight: 300;
  }
</style>

<div class="TravelerInfo">
  <div style="display: flex; align-items: flex-end;">
    <span on:click={toggle} style="cursor: pointer">
      Daily incoming infectious traveler population*:
    </span>
    <span>
      {(dailyVisitorArrivals * P_travel * P_travelersinfected).toFixed(1)}
    </span>
  </div>
  <div style="display: flex; align-items: flex-end; margin-top: 5px;">
    <span>Daily average infectious traveler census:</span>
    <span>
      {(dailyVisitorCensus * P_travel * P_travelersinfected).toFixed(1)}
    </span>
  </div>
  {#if showDialog}
    <Dialog text={dialogText} onClose={toggle} />
  {/if}
</div>
