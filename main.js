const fs = require("fs");

function timeToSeconds(timeStr) {
    let [time, period] = timeStr.split(" ");
    let [h, m, s] = time.split(":").map(Number);

    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;

    return h * 3600 + m * 60 + s;
}

function secondsToTime(sec) {
    let h = Math.floor(sec / 3600);
    let m = Math.floor((sec % 3600) / 60);
    let s = sec % 60;

    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function hmsToSeconds(str){
    let [h,m,s] = str.split(":").map(Number);
    return h*3600 + m*60 + s;
}

// ============================================================
// Function 1: shiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

    let start = timeToSeconds(startTime);
    let end = timeToSeconds(endTime);

    let diff = end - start;

    return secondsToTime(diff);
}

// ============================================================
// Function 2: idleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    let start = timeToSeconds(startTime);
    let end = timeToSeconds(endTime);

    let startDelivery = timeToSeconds("8:00:00 am");
    let endDelivery = timeToSeconds("10:00:00 pm");

    let idle = 0;

    if(start < startDelivery){
        idle += startDelivery - start;
    }

    if(end > endDelivery){
        idle += end - endDelivery;
    }

    return secondsToTime(idle);
}

// ============================================================
// Function 3: activeTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDurationStr, idleTimeStr){

    let shift = hmsToSeconds(shiftDurationStr);
    let idle = hmsToSeconds(idleTimeStr);

    let active = shift - idle;

    return secondsToTime(active);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTimeStr){

    let [year,month,day] = date.split("-").map(Number);

    let quota;

    if(year === 2025 && month === 4 && day >= 10 && day <= 30){
        quota = hmsToSeconds("6:00:00");
    }else{
        quota = hmsToSeconds("8:24:00");
    }

    let active = hmsToSeconds(activeTimeStr);

    return active >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj){

    let data = fs.readFileSync(textFile,"utf8").trim();
    let lines = data.split("\n");

    for(let line of lines){
        let parts = line.split(",");
        if(parts[0] === shiftObj.driverID && parts[2] === shiftObj.date){
            return {};
        }
    }

    let duration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
let idle = getIdleTime(shiftObj.startTime, shiftObj.endTime);
let active = getActiveTime(duration, idle);
    let quota = metQuota(shiftObj.date, active);

    let record = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: duration,
        idleTime: idle,
        activeTime: active,
        metQuota: quota,
        hasBonus: false
    };

    let newLine = [
        record.driverID,
        record.driverName,
        record.date,
        record.startTime,
        record.endTime,
        record.shiftDuration,
        record.idleTime,
        record.activeTime,
        record.metQuota,
        record.hasBonus
    ].join(",");

    fs.appendFileSync(textFile,"\n"+newLine);

    return record;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue){

    let data = fs.readFileSync(textFile,"utf8");
    let lines = data.split("\n");

    for(let i=0;i<lines.length;i++){

        let parts = lines[i].split(",");

        if(parts[0] === driverID && parts[2] === date){
            parts[9] = newValue;
            lines[i] = parts.join(",");
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
function countBonusPerMonth(textFile, driverID, month){

    let data = fs.readFileSync(textFile,"utf8");
    let lines = data.split("\n");

    let count = 0;
    let found = false;

    for(let line of lines){

        let parts = line.split(",");
        let id = parts[0];

        if(id === driverID){

            found = true;

            let date = parts[2];
            let m = Number(date.split("-")[1]);

            if(m === Number(month) && parts[9] === "true"){
                count++;
            }
        }
    }

    if(!found) return -1;

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month){

    let data = fs.readFileSync(textFile,"utf8");
    let lines = data.split("\n");

    let total = 0;

    for(let line of lines){

        let parts = line.split(",");

        if(parts[0] === driverID){

            let date = parts[2];
            let m = Number(date.split("-")[1]);

            if(m === Number(month)){

                total += hmsToSeconds(parts[7]);
            }
        }
    }

    return secondsToTime(total);
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
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month){

    let shifts = fs.readFileSync(textFile,"utf8").split("\n");
    let rates = fs.readFileSync(rateFile,"utf8").split("\n");

    let dayOff;

    for(let r of rates){
        let parts = r.split(",");
        if(parts[0] === driverID){
            dayOff = parts[1];
        }
    }

    let total = 0;

    for(let line of shifts){

        let parts = line.split(",");

        if(parts[0] === driverID){

            let date = parts[2];
            let [y,m,d] = date.split("-").map(Number);

            if(m !== Number(month)) continue;

            let dayName = new Date(date).toLocaleDateString("en-US",{weekday:"long"});

            if(dayName === dayOff) continue;

            if(y === 2025 && m === 4 && d >= 10 && d <= 30){
                total += hmsToSeconds("6:00:00");
            }else{
                total += hmsToSeconds("8:24:00");
            }
        }
    }

    total -= bonusCount * 7200;

    return secondsToTime(total);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile){

    let rates = fs.readFileSync(rateFile,"utf8").split("\n");

    let basePay;
    let tier;

    for(let r of rates){

        let parts = r.split(",");

        if(parts[0] === driverID){
            basePay = Number(parts[2]);
            tier = Number(parts[3]);
        }
    }

    let allowed = {
        1:50,
        2:20,
        3:10,
        4:3
    };

    let actual = hmsToSeconds(actualHours);
    let required = hmsToSeconds(requiredHours);

    if(actual >= required) return basePay;

    let missing = required - actual;

    missing -= allowed[tier] * 3600;

    if(missing <= 0) return basePay;

    let missingHours = Math.floor(missing/3600);

    let deductionRate = Math.floor(basePay / 185);

    let deduction = missingHours * deductionRate;

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
