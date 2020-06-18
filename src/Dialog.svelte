<script>
  import { addDays, format as dateFormat } from "date-fns";

  export let text = "";
  export let onClose = () => {};
</script>

<style>
  .Dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #0002;
    padding: 20px;
    font-size: 16px;
    z-index: 1000;
  }
  .Dialog .wrapper {
    box-shadow: 0 0 4px 4px #0001;
    max-width: 100%;
    width: 500px;
    margin: 5vh auto 0;
    padding: 30px;
    background: #fff;
  }
  .Dialog .content {
    white-space: pre-line;
    line-height: 1.4;
  }
  .Dialog .footer {
    padding-top: 30px;
    display: flex;
    justify-content: flex-end;
  }
  .Dialog .footer button {
    background: #386cb0;
    border: none;
    color: #fff;
    font-size: 16px;
    padding: 10px 20px;
  }
</style>

<div class="Dialog">
  <div class="wrapper">
    <div class="content">{text}</div>
    <div class="footer"><button on:click={onClose}>Close</button></div>
  </div>
</div>
