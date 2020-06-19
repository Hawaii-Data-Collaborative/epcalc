import { differenceInCalendarDays, startOfDay, endOfMonth } from 'date-fns'

export function getScenarios(startDate) {
  const R0 = 2.22 //2.2

  function getScenario(P_SEVERE, P_travel, P_travelersinfected, interventionLines) {
    const Time_to_death = 12.5 //32
    const logN = Math.log(1415872)
    const N = Math.exp(logN)
    const I0 = 10 //1
    const D_incbation = 3.5 //4.1 //5.2
    const D_infectious = 10.0 //8 //2.9
    const D_recovery_mild = 11 //(14 - 2.9)
    const D_recovery_severe = 13 //(31.5 - 2.9)
    const D_hospital_lag = 6 //5
    const D_death = 4.5 //Time_to_death - D_infectious
    const CFR = 0.005 //0.059 //0.005 //0.02
    const InterventionTime = 100
    const OMInterventionAmt = 2 / 3
    const InterventionAmt = 1 - OMInterventionAmt
    const Time = 220
    const Xmax = 110000
    const dt = 3.07
    // const P_SEVERE = 0.12 //0.045 //0.2
    const duration = 7 * 12 * 1e10
    const D_travel = new Date('2020-07-01T00:00')

    const rtLevel0 = 0.36 //Rt=1.42
    const rtLevel1 = 0.45 //Rt=1.22
    const rtLevel2 = 0.55 //Rt=1.0
    const rtLevel3 = 0.64 //Rt=0.8
    const rtLevel4 = 0.73 //Rt=0.6
    const rtOptions = [
      {
        name: 'Normal', 
        index: 0, 
        om: rtLevel0,
        amount: (R0 * (1 - rtLevel0)).toFixed(2),
        decrease: (100 * (1 - (1 - rtLevel0))).toFixed(2),
      },
      {
        name: 'Prepare', 
        index: 1, 
        om: rtLevel1,
        amount: (R0 * (1 - rtLevel1)).toFixed(2),
        decrease: (100 * (1 - (1 - rtLevel1))).toFixed(2),
      },
      {
        name: 'Reduce', 
        index: 2, 
        om: rtLevel2,
        amount: (R0 * (1 - rtLevel2)).toFixed(2),
        decrease: (100 * (1 - (1 - rtLevel2))).toFixed(2),
      },
      {
        name: 'Restrict', 
        index: 3, 
        om: rtLevel3,
        amount: (R0 * (1 - rtLevel3)).toFixed(2),
        decrease: (100 * (1 - (1 - rtLevel3))).toFixed(2),
      },
      {
        name: 'Lockdown', 
        index: 4, 
        om: rtLevel4,
        amount: (R0 * (1 - rtLevel4)).toFixed(2),
        decrease: (100 * (1 - (1 - rtLevel4))).toFixed(2),
      },
    ]

    return {
      Time_to_death,
      logN,
      N,
      I0,
      R0,
      D_incbation,
      D_infectious,
      D_recovery_mild,
      D_recovery_severe,
      D_hospital_lag,
      D_death,
      CFR,
      InterventionTime,
      OMInterventionAmt,
      InterventionAmt,
      Time,
      Xmax,
      dt,
      P_SEVERE,
      duration,
      rtLevel0,
      rtLevel1,
      rtLevel2,
      rtLevel3,
      rtLevel4,
      rtOptions,
      interventionLines,

      travelInfos: [
        { D_travel, P_travel, P_travelersinfected }
      ]
    }
  }

  return {
    bestCase: getScenario(0.06, 0.2, 0.002, [
      {
        time: differenceInCalendarDays(new Date('2020-06-30T00:00'), startDate),
        amount: 0.6 / R0,
        om: 0.73,
        index: 0,
        rtIndex: 4,
        canDrag: false,
        label: '6/30: Potential phase change',
      },
      {
        time: differenceInCalendarDays(new Date('2020-07-15T00:00'), startDate),
        amount: 0.8 / R0,
        om: 0.64,
        index: 1,
        rtIndex: 3,
        canDrag: false,
        label: '7/15: Potential phase change (travel increase)',
      },
      {
        time: differenceInCalendarDays(new Date('2020-08-15T00:00'), startDate),
        amount: 1.0 / R0,
        om: 0.55,
        index: 2,
        rtIndex: 2,
        canDrag: false,
        label: '8/15: Potential phase change',
      },
      {
        time: differenceInCalendarDays(new Date('2020-09-10T00:00'), startDate),
        amount: 1.22 / R0,
        om: 0.45,
        index: 3,
        rtIndex: 1,
        canDrag: false,
        label: '9/10: fall semester and travel increase',
      },
    ]),
    worstCase: getScenario(0.12, 0.2, 0.005, [
      {
        time: differenceInCalendarDays(new Date('2020-07-15T00:00'), startDate),
        amount: 0.8 / R0,
        om: 0.64,
        index: 0,
        rtIndex: 3,
        canDrag: false,
        label: '7/15: Potential phase change (travel increase)',
      },
      {
        time: differenceInCalendarDays(new Date('2020-08-01T00:00'), startDate),
        amount: 1.0 / R0,
        om: 0.55,
        index: 1,
        rtIndex: 2,
        canDrag: false,
        label: '8/1: Potential phase change',
      },
      {
        time: differenceInCalendarDays(new Date('2020-08-15T00:00'), startDate),
        amount: 1.22 / R0,
        om: 0.45,
        index: 2,
        rtIndex: 1,
        canDrag: false,
        label: '8/15: Potential phase change',
      },
    ]),
  }
}
