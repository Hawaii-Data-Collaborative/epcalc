<script>
  import { addDays, format as dateFormat } from "date-fns";

  export let data = [];
  export let R0 = 2.5;
  export let startDate = new Date();
</script>

<style>

</style>

<div class="InterventionLineTable">
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Rt</th>
      </tr>
    </thead>
    <tbody>
      {#each data as line, i}
        <tr>
          <td>{dateFormat(addDays(startDate, line.time), 'M/d')}</td>
          <td>{(R0*(1-line.amount)).toFixed(2)}</td>
        </tr>
      {/each}
    </tbody>
  </table>

</div>
