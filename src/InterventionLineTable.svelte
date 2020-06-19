<script>
  import { addDays, format as dateFormat } from "date-fns";

  export let data = [];
  export let rtOptions = [];
  export let R0 = 2.5;
  export let startDate = new Date();

  function getRtOption(line) {
    const rtOption = rtOptions.find(o => o.om === line.om)
    if (!rtOption) {
      return ''
    }

    return `Level ${rtOption.index} · ${rtOption.name}`
  }
</script>

<style>
  .InterventionLineTable {
    font-family: nyt-franklin, helvetica, arial, sans-serif;
    font-weight: 300;
    font-size: 14px;
    color: #666;
    width: 100%;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th {
    text-align: left;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #aaa;
    border-bottom: 1px solid #ddd;
  }
</style>

<div class="InterventionLineTable">
  <table>
    <thead>
      <tr>
        <th>Intervention #</th>
        <th>Date</th>
        <th>Rt</th>
      </tr>
    </thead>
    <tbody>
      {#each data as line, i}
        <tr>
          <td>{i + 1} – {getRtOption(line)}</td>
          <td>{dateFormat(addDays(startDate, line.time), 'M/d/Y')}</td>
          <td>{(R0 * line.amount).toFixed(2)}</td>
        </tr>
      {/each}
    </tbody>
  </table>

</div>
