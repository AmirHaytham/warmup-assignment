const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    startTime = startTime.toLowerCase(); 
    endTime = endTime.toLowerCase();
    //splitting each time into time and period (am/pm)
    let [sTime, sPeriod] = startTime.split(" "); 
    let [eTime, ePeriod] = endTime.split(" ");
    let [sh, sm, ss] = sTime.split(":").map(Number); 
    let [eh, em, es] = eTime.split(":").map(Number);
    if (sPeriod === "pm" && sh !== 12) sh += 12; 
    if (sPeriod === "am" && sh === 12) sh = 0;
    if (ePeriod === "pm" && eh !== 12) eh += 12; 
    if (ePeriod === "am" && eh === 12) eh = 0;
    let difference = (eh * 3600 + em * 60 + es) - (sh * 3600 + sm * 60 + ss);
    let hours = Math.floor(difference / 3600);
    let minutes = Math.floor((difference % 3600) / 60);
    let seconds = difference % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    startTime = startTime.toLowerCase();
    endTime = endTime.toLowerCase();

    let [sTime, sPeriod] = startTime.split(" ");
    let [eTime, ePeriod] = endTime.split(" ");

    let [sh, sm, ss] = sTime.split(":").map(Number);
    let [eh, em, es] = eTime.split(":").map(Number);
// convert to 24 hour military timing 
    if (sPeriod === "pm" && sh !== 12) sh += 12;
    if (sPeriod === "am" && sh === 12) sh = 0;

    if (ePeriod === "pm" && eh !== 12) eh += 12;
    if (ePeriod === "am" && eh === 12) eh = 0;
// converting to seconds for easier calculations
    let startSec = sh * 3600 + sm * 60 + ss;
    let endSec = eh * 3600 + em * 60 + es;
// delivery boundaries between 8 am and 10 pm in seconds
    let deliveryStart = 8 * 3600;       
    let deliveryEnd = 22 * 3600;       

    let idle = 0;
// calculating if the start time is before the delivery start time (8 am) 
    if (startSec < deliveryStart) {
        // choose the least between the end of the shift and the deliver start - the shift start to calculate idle time
        idle += Math.max(0, Math.min(endSec, deliveryStart) - startSec);
    }

    if (endSec > deliveryEnd) {
        idle += Math.max(0, endSec - Math.max(startSec, deliveryEnd));
    }

    let h = Math.floor(idle / 3600);
    let m = Math.floor((idle % 3600) / 60);
    let s = idle % 60;

    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}


// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
  
    let [sh, sm, ss] = shiftDuration.split(":").map(Number);
    let [ih, im, is] = idleTime.split(":").map(Number);
// converting to seconds 
    let shiftSec = sh * 3600 + sm * 60 + ss;
    let idleSec = ih * 3600 + im * 60 + is;
// get the active working time 
    let active = shiftSec - idleSec;

    let h = Math.floor(active / 3600);
    let m = Math.floor((active % 3600) / 60);
    let s = active % 60;

    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}


// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    let [h, m, s] = activeTime.split(":").map(Number);
    
    let activeSec = h * 3600 + m * 60 + s;

    let d = new Date(date);
    // Eid El Fitr between april 10 and april 30 2025
    let eidStart = new Date("2025-04-10");
    
    let eidEnd = new Date("2025-04-30");
// quoata in second
    let quotaSec;
// if eid , quoata is 6 hours else it is 8 hours and 24 minutes 
    if (d >= eidStart && d <= eidEnd) {
        quotaSec = 6 * 3600;
    } else {
        quotaSec = (8 * 3600) + (24 * 60);
    }

    return activeSec >= quotaSec;
}



// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    // TODO: Implement this function
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // TODO: Implement this function
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // TODO: Implement this function
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
