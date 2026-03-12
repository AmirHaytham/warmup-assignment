const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    let s = timeToSec(startTime);
    let e = timeToSec(endTime);
    if (e < s) e += 24 * 3600;
    return secToTime(e - s);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    let s = timeToSec(startTime);
    let e = timeToSec(endTime);
    if (e < s) e += 24 * 3600; 

    let dStart = 8 * 3600;
    let dEnd = 22 * 3600;
    
    let active1 = Math.max(0, Math.min(e, dEnd) - Math.max(s, dStart));
    let active2 = Math.max(0, Math.min(e, dEnd + 24*3600) - Math.max(s, dStart + 24*3600));
    let activeSecs = active1 + active2;
    let idleSecs = (e - s) - activeSecs;
    
    return secToTime(idleSecs);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    return secToTime(timeToSec(shiftDuration) - timeToSec(idleTime));
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    let activeSecs = timeToSec(activeTime);
    let quotaSecs = 8 * 3600 + 24 * 60;
    
    let parts = date.split("-");
    let y = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    let day = parseInt(parts[2], 10);
    
    if (y === 2025 && m === 4 && day >= 10 && day <= 30) {
        quotaSecs = 6 * 3600;
    }
    
    return activeSecs >= quotaSecs;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let fileContent = fs.readFileSync(textFile, "utf8").trim();
    let data = fileContent === "" ? [] : fileContent.split("\n");
    let header = "DriverID,DriverName,Date,StartTime,EndTime,ShiftDuration,IdleTime,ActiveTime,MetQuota,HasBonus";
    let lines = [];
    
    if (data.length > 0) {
        header = data[0];
        lines = data.slice(1);
    }
    
    for (let l of lines) {
        if (!l.trim()) continue;
        let parts = l.split(",");
        if (parts[0] === shiftObj.driverID && parts[2] === shiftObj.date) {
            return {};
        }
    }
    
    let shiftDur = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleT = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeT = getActiveTime(shiftDur, idleT);
    let mQuota = metQuota(shiftObj.date, activeT);
    
    let newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDur,
        idleTime: idleT,
        activeTime: activeT,
        metQuota: mQuota,
        hasBonus: false
    };
    
    let newLine = [
        newRecord.driverID, newRecord.driverName, newRecord.date,
        newRecord.startTime, newRecord.endTime, newRecord.shiftDuration,
        newRecord.idleTime, newRecord.activeTime, newRecord.metQuota,
        newRecord.hasBonus
    ].join(",");
    
    lines.push(newLine);
    
    lines.sort((a, b) => {
        let pa = a.split(",");
        let pb = b.split(",");
        if (pa[0] !== pb[0]) return pa[0].localeCompare(pb[0]);
        return pa[2].localeCompare(pb[2]);
    });
    
    let outData = [header, ...lines].join("\n") + "\n";
    fs.writeFileSync(textFile, outData, "utf8");
    
    return newRecord;
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
    let data = fs.readFileSync(textFile, "utf8").trim().split("\n");
    for (let i = 1; i < data.length; i++) {
        if (!data[i].trim()) continue;
        let parts = data[i].split(",");
        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = newValue.toString();
            data[i] = parts.join(",");
            break;
        }
    }
    fs.writeFileSync(textFile, data.join("\n") + "\n", "utf8");
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let data = fs.readFileSync(textFile, "utf8").trim().split("\n");
    let driverExists = false;
    for (let i = 1; i < data.length; i++) {
        if (!data[i].trim()) continue;
        let parts = data[i].split(",");
        if (parts[0] === driverID) {
            driverExists = true;
            break;
        }
    }
    if (!driverExists) return -1;
    
    let count = 0;
    let tMonth = parseInt(month, 10);
    for (let i = 1; i < data.length; i++) {
        if (!data[i].trim()) continue;
        let parts = data[i].split(",");
        if (parts[0] === driverID) {
            let dSub = parts[2].split("-");
            let m = parseInt(dSub[1], 10);
            if (m === tMonth) {
                if (parts[9].toLowerCase() === "true") {
                    count++;
                }
            }
        }
    }
    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let data = fs.readFileSync(textFile, "utf8").trim().split("\n");
    let targetM = parseInt(month, 10);
    let totalSecs = 0;
    for (let i = 1; i < data.length; i++) {
        if (!data[i].trim()) continue;
        let parts = data[i].split(",");
        if (parts[0] === driverID) {
            let m = parseInt(parts[2].split("-")[1], 10);
            if (m === targetM) {
                totalSecs += timeToSec(parts[7]);
            }
        }
    }
    return secToTime(totalSecs);
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
    let targetM = parseInt(month, 10);
    let rateData = fs.readFileSync(rateFile, "utf8").trim().split("\n");
    let dayOffStr = "";
    for(let i = 0; i < rateData.length; i++) {
        if (!rateData[i].trim()) continue;
        let p = rateData[i].split(",");
        if (p[0] === driverID) {
            dayOffStr = p[1];
            break;
        }
    }
    
    let daysMap = {"sunday":0, "monday":1, "tuesday":2, "wednesday":3, "thursday":4, "friday":5, "saturday":6};
    let targetDayOff = -1;
    if (dayOffStr) {
        targetDayOff = daysMap[dayOffStr.toLowerCase()];
    }
    
    let totalSecs = 0;
    let data = fs.readFileSync(textFile, "utf8").trim().split("\n");
    for (let i = 1; i < data.length; i++) {
        if (!data[i].trim()) continue;
        let parts = data[i].split(",");
        if (parts[0] === driverID) {
            let dateStr = parts[2];
            let dParts = dateStr.split("-");
            let y = parseInt(dParts[0], 10);
            let m = parseInt(dParts[1], 10);
            let day = parseInt(dParts[2], 10);
            
            if (m === targetM) {
                let dObj = new Date(y, m - 1, day);
                if (dObj.getDay() !== targetDayOff) {
                    let quotaSecs = 8 * 3600 + 24 * 60; 
                    if (y === 2025 && m === 4 && day >= 10 && day <= 30) {
                        quotaSecs = 6 * 3600;
                    }
                    totalSecs += quotaSecs;
                }
            }
        }
    }
    
    totalSecs -= bonusCount * 2 * 3600;
    if (totalSecs < 0) totalSecs = 0;
    
    return secToTime(totalSecs);
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
    let rateData = fs.readFileSync(rateFile, "utf8").trim().split("\n");
    let basePay = 0;
    let tier = 0;
    for (let i = 0; i < rateData.length; i++) {
        if (!rateData[i].trim()) continue;
        let p = rateData[i].split(",");
        if (p[0] === driverID) {
            basePay = parseFloat(p[2]);
            tier = parseInt(p[3], 10);
            break;
        }
    }
    
    let allowedMissingHrs = 0;
    if (tier === 1) allowedMissingHrs = 50;
    else if (tier === 2) allowedMissingHrs = 20;
    else if (tier === 3) allowedMissingHrs = 10;
    else if (tier === 4) allowedMissingHrs = 3;
    
    let deductionRate = Math.floor(basePay / 185);
    let reqSecs = timeToSec(requiredHours);
    let actSecs = timeToSec(actualHours);
    
    let missingSecs = reqSecs - actSecs;
    if (missingSecs <= 0) return basePay;
    
    let missingHrs = Math.floor(missingSecs / 3600);
    let chargedHrs = Math.max(0, missingHrs - allowedMissingHrs);
    
    let net = basePay - (chargedHrs * deductionRate);
    return Math.floor(net);
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
