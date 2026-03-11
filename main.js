const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    function toSeconds(timeStr) {

        let parts = timeStr.split(" ");
        let time = parts[0];
        let period = parts[1];

        let t = time.split(":");
        let h = parseInt(t[0]);
        let m = parseInt(t[1]);
        let s = parseInt(t[2]);

        if (period === "pm" && h !== 12) {
            h += 12;
        }

        if (period === "am" && h === 12) {
            h = 0;
        }

        return h * 3600 + m * 60 + s;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    let diff = end - start;

    if (diff < 0) {
        diff += 24 * 3600;
    }

    let hours = Math.floor(diff / 3600);
    let minutes = Math.floor((diff % 3600) / 60);
    let seconds = diff % 60;

    return hours + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
        function toSeconds(timeStr) {
        let parts = timeStr.split(" ");
        let time = parts[0];
        let period = parts[1];

        let t = time.split(":");
        let h = parseInt(t[0]);
        let m = parseInt(t[1]);
        let s = parseInt(t[2]);

        if (period === "pm" && h !== 12) {
            h += 12;
        }

        if (period === "am" && h === 12) {
            h = 0;
        }

        return h * 3600 + m * 60 + s;
    }

    let start = toSeconds(startTime);
    let end = toSeconds(endTime);

    if (end < start) {
        end += 24 * 3600;
    }

    let deliveryStart = 8 * 3600;
    let deliveryEnd = 22 * 3600;

    let idle = 0;

    if (start < deliveryStart) {
        idle += deliveryStart - start;
    }

    if (end > deliveryEnd) {
        idle += end - deliveryEnd;
    }

    let h = Math.floor(idle / 3600);
    let m = Math.floor((idle % 3600) / 60);
    let s = idle % 60;

    m = String(m).padStart(2, '0');
    s = String(s).padStart(2, '0');

    return h + ":" + m + ":" + s;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    
    function toSeconds(timeStr) {
        let parts = timeStr.split(":");

        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);

        return h * 3600 + m * 60 + s;
    }

    let shift = toSeconds(shiftDuration);
    let idle = toSeconds(idleTime);

    let active = shift - idle;

    let h = Math.floor(active / 3600);
    let m = Math.floor((active % 3600) / 60);
    let s = active % 60;

    m = String(m).padStart(2, '0');
    s = String(s).padStart(2, '0');

    return h + ":" + m + ":" + s;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    function toSeconds(timeStr) {
        let parts = timeStr.split(":");

        let h = parseInt(parts[0]);
        let m = parseInt(parts[1]);
        let s = parseInt(parts[2]);

        return h * 3600 + m * 60 + s;
    }

    let active = toSeconds(activeTime);

    let normalQuota = 8 * 3600 + 24 * 60;
    let eidQuota = 6 * 3600;

    let day = parseInt(date.split("-")[2]);

    let quota;

    if (day >= 10 && day <= 30) {
        quota = eidQuota;
    } else {
        quota = normalQuota;
    }

    return active >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {

    const fs = require("fs");

    let data = fs.readFileSync(textFile, "utf8").trim();
    let lines = data.length ? data.split("\n") : [];

    for (let line of lines) {
        let parts = line.split(",");

        if (parts[0] === shiftObj.driverID && parts[2] === shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quotaMet = metQuota(shiftObj.date, activeTime);

    let newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quotaMet,
        hasBonus: false
    };

    let row = [
        newRecord.driverID,
        newRecord.driverName,
        newRecord.date,
        newRecord.startTime,
        newRecord.endTime,
        newRecord.shiftDuration,
        newRecord.idleTime,
        newRecord.activeTime,
        newRecord.metQuota,
        newRecord.hasBonus
    ].join(",");

    let insertIndex = lines.length;

    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].startsWith(shiftObj.driverID + ",")) {
            insertIndex = i + 1;
            break;
        }
    }

    lines.splice(insertIndex, 0, row);

    fs.writeFileSync(textFile, lines.join("\n"));

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

    const fs = require("fs");

    let data = fs.readFileSync(textFile, "utf8").trim();
    let lines = data.split("\n");

    for (let i = 0; i < lines.length; i++) {

        let parts = lines[i].split(",");

        if (parts[0] === driverID && parts[2] === date) {

            parts[9] = newValue;

            lines[i] = parts.join(",");

            break;
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    const fs = require("fs");

    let data = fs.readFileSync(textFile, "utf8").trim();
    let lines = data.split("\n");

    month = parseInt(month);

    let count = 0;
    let driverExists = false;

    for (let line of lines) {

        let parts = line.split(",");

        if (parts[0] === driverID) {

            driverExists = true;

            let dateParts = parts[2].split("-");
            let recordMonth = parseInt(dateParts[1]);

            let hasBonus = parts[9].trim();

            if (recordMonth === month && hasBonus === "true") {
                count++;
            }
        }
    }

    if (!driverExists) {
        return -1;
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

    const fs = require("fs");

    let data = fs.readFileSync(textFile, "utf8").trim();
    let lines = data.split("\n");

    let totalSeconds = 0;

    for (let line of lines) {

        let parts = line.split(",");

        if (parts[0] === driverID) {

            let dateParts = parts[2].split("-");
            let recordMonth = parseInt(dateParts[1]);

            if (recordMonth === month) {

                let timeParts = parts[7].split(":");

                let h = parseInt(timeParts[0]);
                let m = parseInt(timeParts[1]);
                let s = parseInt(timeParts[2]);

                totalSeconds += h * 3600 + m * 60 + s;
            }
        }
    }

    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    minutes = String(minutes).padStart(2, '0');
    seconds = String(seconds).padStart(2, '0');

    return hours + ":" + minutes + ":" + seconds;
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
