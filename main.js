const fs = require("fs");

function toSeconds(t) {
    t = t.trim().toLowerCase();
    var period = t.slice(-2);
    var nums = t.slice(0, -2).trim().split(":");
    var h = parseInt(nums[0]);
    var m = parseInt(nums[1]);
    var s = parseInt(nums[2]);
    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    return h * 3600 + m * 60 + s;
}

function durToSec(d) {
    var p = d.trim().split(":");
    return parseInt(p[0]) * 3600 + parseInt(p[1]) * 60 + parseInt(p[2]);
}

function secToDur(sec) {
    sec = Math.abs(sec);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function secToLongDur(sec) {
    sec = Math.abs(sec);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return String(h).padStart(3, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    var diff = toSeconds(endTime) - toSeconds(startTime);
    return secToDur(diff);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    var start = toSeconds(startTime);
    var end = toSeconds(endTime);
    var workStart = 8 * 3600;
    var workEnd = 22 * 3600;
    var idle = 0;
    if (start < workStart) {
        idle += Math.min(workStart, end) - start;
    }
    if (end > workEnd) {
        idle += end - Math.max(workEnd, start);
    }
    if (idle < 0) idle = 0;
    return secToDur(idle);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    var diff = durToSec(shiftDuration) - durToSec(idleTime);
    return secToDur(diff);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    var parts = date.split("-");
    var y = parseInt(parts[0]);
    var mo = parseInt(parts[1]);
    var d = parseInt(parts[2]);
    var needed;
    if (y === 2025 && mo === 4 && d >= 10 && d <= 30) {
        needed = 6 * 3600;
    } else {
        needed = 8 * 3600 + 24 * 60;
    }
    return durToSec(activeTime) >= needed;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    var content = fs.readFileSync(textFile, "utf8");
    var lines = content.split("\n").filter(function(l) { return l.trim() !== ""; });

    for (var i = 0; i < lines.length; i++) {
        var c = lines[i].split(",");
        if (c[0].trim() === shiftObj.driverID && c[2].trim() === shiftObj.date) {
            return {};
        }
    }

    var sd = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    var it = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    var at = getActiveTime(sd, it);
    var mq = metQuota(shiftObj.date, at);

    var obj = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: sd,
        idleTime: it,
        activeTime: at,
        metQuota: mq,
        hasBonus: false
    };

    var newLine = obj.driverID + "," + obj.driverName + "," + obj.date + "," +
        obj.startTime + "," + obj.endTime + "," + obj.shiftDuration + "," +
        obj.idleTime + "," + obj.activeTime + "," + obj.metQuota + "," + obj.hasBonus;

    var last = -1;
    for (var j = 0; j < lines.length; j++) {
        if (lines[j].split(",")[0].trim() === shiftObj.driverID) {
            last = j;
        }
    }

    if (last === -1) {
        lines.push(newLine);
    } else {
        lines.splice(last + 1, 0, newLine);
    }

    fs.writeFileSync(textFile, lines.join("\n") + "\n", "utf8");
    return obj;
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
    var content = fs.readFileSync(textFile, "utf8");
    var lines = content.split("\n").filter(function(l) { return l.trim() !== ""; });

    for (var i = 0; i < lines.length; i++) {
        var c = lines[i].split(",");
        if (c[0].trim() === driverID && c[2].trim() === date) {
            c[9] = String(newValue);
            lines[i] = c.join(",");
            break;
        }
    }

    fs.writeFileSync(textFile, lines.join("\n") + "\n", "utf8");
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    var content = fs.readFileSync(textFile, "utf8");
    var lines = content.split("\n").filter(function(l) { return l.trim() !== ""; });

    var found = false;
    var count = 0;
    var mo = parseInt(month);

    for (var i = 0; i < lines.length; i++) {
        var c = lines[i].split(",");
        if (c[0].trim() === driverID) {
            found = true;
            var recMo = parseInt(c[2].trim().split("-")[1]);
            if (recMo === mo && c[9].trim() === "true") {
                count++;
            }
        }
    }

    return found ? count : -1;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    var content = fs.readFileSync(textFile, "utf8");
    var lines = content.split("\n").filter(function(l) { return l.trim() !== ""; });

    var total = 0;

    for (var i = 0; i < lines.length; i++) {
        var c = lines[i].split(",");
        if (c[0].trim() === driverID) {
            var recMo = parseInt(c[2].trim().split("-")[1]);
            if (recMo === month) {
                total += durToSec(c[7].trim());
            }
        }
    }

    return secToLongDur(total);
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
    var rateContent = fs.readFileSync(rateFile, "utf8");
    var rateLines = rateContent.split("\n").filter(function(l) { return l.trim() !== ""; });

    var dayOff = "";
    for (var i = 0; i < rateLines.length; i++) {
        var rc = rateLines[i].split(",");
        if (rc[0].trim() === driverID) {
            dayOff = rc[1].trim().toLowerCase();
            break;
        }
    }

    var days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    var shiftContent = fs.readFileSync(textFile, "utf8");
    var shiftLines = shiftContent.split("\n").filter(function(l) { return l.trim() !== ""; });

    var total = 0;

    for (var j = 0; j < shiftLines.length; j++) {
        var c = shiftLines[j].split(",");
        if (c[0].trim() === driverID) {
            var dateStr = c[2].trim();
            var recMo = parseInt(dateStr.split("-")[1]);
            if (recMo !== month) continue;

            var dateObj = new Date(dateStr);
            if (days[dateObj.getDay()] === dayOff) continue;

            var y = parseInt(dateStr.split("-")[0]);
            var d = parseInt(dateStr.split("-")[2]);
            var quota;
            if (y === 2025 && recMo === 4 && d >= 10 && d <= 30) {
                quota = 6 * 3600;
            } else {
                quota = 8 * 3600 + 24 * 60;
            }

            total += quota;
        }
    }

    total -= bonusCount * 2 * 3600;
    if (total < 0) total = 0;

    return secToLongDur(total);
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
    var rateContent = fs.readFileSync(rateFile, "utf8");
    var rateLines = rateContent.split("\n").filter(function(l) { return l.trim() !== ""; });

    var basePay = 0;
    var tier = 0;
    for (var i = 0; i < rateLines.length; i++) {
        var c = rateLines[i].split(",");
        if (c[0].trim() === driverID) {
            basePay = parseInt(c[2].trim());
            tier = parseInt(c[3].trim());
            break;
        }
    }

    var allowed;
    if (tier === 1) allowed = 50;
    else if (tier === 2) allowed = 20;
    else if (tier === 3) allowed = 10;
    else allowed = 3;

    var actualSec = durToSec(actualHours);
    var requiredSec = durToSec(requiredHours);

    if (actualSec >= requiredSec) return basePay;

    var missingHours = (requiredSec - actualSec) / 3600;
    var billable = missingHours - allowed;

    if (billable <= 0) return basePay;

    var rate = Math.floor(basePay / 185);
    var deduction = Math.floor(billable) * rate;

    return basePay - deduction;
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
