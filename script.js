let currentWarehouse = 'MAIN';
let userRole = 'USER';

window.onload = () => {
  // ตั้งค่าเดือนในสรุปผล
  if (document.getElementById('summaryMonth')) {
    document.getElementById('summaryMonth').value = new Date().toISOString().slice(0, 7);
  }
  
  // ตั้งค่าวันที่เบิกเป็น "วันนี้" ทันทีที่โหลด
  const withdrawDateInput = document.getElementById('withdrawDate');
  if (withdrawDateInput) {
    withdrawDateInput.value = new Date().toISOString().split('T')[0];
  }

  showLoader(true);
  google.script.run.withSuccessHandler(res => {
    if(res.authorized) {
      document.getElementById('userDisplay').innerText = res.email;
      userRole = res.role;
      applyPermissions();
      initApp();
    } else { Swal.fire('Error', res.message, 'error'); }
  }).checkUserAccess();
};

function applyPermissions() {
  if(userRole === 'SLIP_ONLY') {
    currentWarehouse = 'SLIP';
    document.getElementById('wh-toggle').style.display = 'none';
    document.getElementById('nav-manage').style.display = 'none';
    document.getElementById('nav-report').style.display = 'none';
    document.getElementById('nav-summary').style.display = 'none';
  } else if(userRole === 'USER') {
    document.getElementById('nav-manage').style.display = 'none';
  }
}

function initApp() {
  showLoader(true);
  google.script.run.withSuccessHandler(res => {
    renderData(res);
    showLoader(false);
  }).getAllData(currentWarehouse);
}

function renderData(data) {
  const carSel = document.getElementById('carId');
  const carNumSel = document.getElementById('carNum');
  const thCol1 = document.getElementById('thCol1');

  if(currentWarehouse === 'MAIN') {
    document.getElementById('labelCarId').innerText = "ชื่อผู้เบิก";
    thCol1.innerText = "ผู้เบิก/รถ";
    carSel.innerHTML = '<option value="">-- เลือกชื่อ --</option>' + data.staff.map(s => `<option value="${s[0]}">${s[0]}</option>`).join('');
    carNumSel.innerHTML = '<option value="">-- เลือกรถ --</option>' + data.cars.map(c => `<option value="${c[0]}">${c[0]}</option>`).join('');
    document.getElementById('carNumContainer').style.display = 'block';
  } else {
    document.getElementById('labelCarId').innerText = "หมายเลขรถ";
    thCol1.innerText = "หมายเลขรถ";
    carSel.innerHTML = '<option value="">-- เลือกรถ --</option>' + data.cars.map(c => `<option value="${c[0]}">${c[0]}</option>`).join('');
    document.getElementById('carNumContainer').style.display = 'none';
  }
  document.getElementById('itemId').innerHTML = '<option value="">-- เลือกพัสดุ --</option>' + data.inventory.map(i => `<option value="${i[0]}">${i[1]} (${i[2]})</option>`).join('');
  document.getElementById('transTable').innerHTML = data.todayTransactions.map(t => {
    let displayEntity = (currentWarehouse === 'MAIN') ? `<b>${t.carId}</b><br><small>${t.carNum || ''}</small>` : `<b>${t.carNum}</b>`;
    return `<tr>
        <td>${displayEntity}</td>
        <td><small class="text-primary fw-bold">[${t.itemId}]</small><br>${t.itemName}</td>
        <td class="text-center"><b>${t.amount}</b></td>
        <td class="text-center no-print">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="editRow('${t.rowId}','${t.carId}','${t.carNum}','${t.itemId}','${t.amount}')"><i class="fa fa-edit"></i></button>
            <button class="btn btn-outline-warning" onclick="confirmReturn('${t.rowId}',${t.amount})"><i class="fa fa-undo"></i></button>
            <button class="btn btn-outline-danger" onclick="deleteRow('${t.rowId}')"><i class="fa fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('') || '<tr><td colspan="4" class="text-center p-3 text-muted">ไม่มีรายการวันนี้</td></tr>';
  document.getElementById('invTable').innerHTML = data.inventory.map(i => `<tr onclick="fillManageForm('${i[0]}','${i[1]}')"><td>${i[0]}</td><td>${i[1]}</td><td class="text-center"><b>${i[2]}</b></td></tr>`).join('');
}

function showPane(pane) {
  document.querySelectorAll('.pane').forEach(p => {
      p.style.display = 'none';
      p.classList.remove('active-pane');
  });
  const target = document.getElementById(pane + '-pane');
  target.style.display = 'block';
  target.classList.add('active-pane');
  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  document.getElementById('nav-' + pane).classList.add('active');
}

function loadReport() {
  const start = document.getElementById('startDate').value;
  const end = document.getElementById('endDate').value;
  if(!start || !end) {
    Swal.fire('แจ้งเตือน', 'กรุณาเลือกช่วงวันที่ก่อนทำการค้นหา', 'warning');
    return;
  }
  showLoader(true);
  google.script.run.withSuccessHandler(data => {
    document.getElementById('reportTableBody').innerHTML = data.map(r => `
      <tr>
        <td><small>${r.date}</small></td>
        <td>${r.staff}</td>
        <td>${r.carNum}</td>
        <td><small class="text-primary">[${r.itemCode}]</small><br>${r.itemName}</td>
        <td class="text-center"><b>${r.qty}</b></td>
        <td><small>${r.status}</small></td>
        <td class="text-center no-print">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="editRow('${r.rowId}','${r.staff}','${r.carNum}','${r.itemCode}','${r.qty}')" title="แก้ไข"><i class="fa fa-edit"></i></button>
            <button class="btn btn-outline-warning" onclick="confirmReturn('${r.rowId}',${r.qty})" title="คืน"><i class="fa fa-undo"></i></button>
            <button class="btn btn-outline-danger" onclick="deleteRow('${r.rowId}')" title="ลบ"><i class="fa fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('') || '<tr><td colspan="7" class="text-center p-4">ไม่พบข้อมูลในช่วงเวลาดังกล่าว</td></tr>';
    showLoader(false);
  }).getReportData(currentWarehouse, start, end);
}

function loadSummary() {
  const monthVal = document.getElementById('summaryMonth').value;
  if(!monthVal) { Swal.fire('แจ้งเตือน', 'กรุณาเลือกเดือน', 'warning'); return; }
  const [year, month] = monthVal.split('-');
  const start = `${year}-${month}-01`;
  const end = new Date(year, month, 0).toISOString().split('T')[0];
  showLoader(true);
  google.script.run.withSuccessHandler(data => {
    const summaryMap = {};
    data.forEach(r => {
      if(r.status !== 'คืนพัสดุ') {
         const code = r.itemCode;
         if(!summaryMap[code]) summaryMap[code] = { name: r.itemName, qty: 0 };
         summaryMap[code].qty += Number(r.qty);
      }
    });
    let html = "";
    for (const code in summaryMap) {
      html += `<tr><td>${code}</td><td>${summaryMap[code].name}</td><td class="text-center"><b>${summaryMap[code].qty}</b></td></tr>`;
    }
    document.getElementById('summaryTableBody').innerHTML = html || '<tr><td colspan="3" class="text-center p-3">ไม่มีข้อมูล</td></tr>';
    showLoader(false);
  }).getReportData(currentWarehouse, start, end);
}

function preparePrint(title) {
  document.getElementById('printTitle').innerText = title;
  document.getElementById('printSubtitle').innerText = "คลัง: " + (currentWarehouse === 'MAIN' ? 'พัสดุอุปกรณ์' : 'ม้วน Slip');
  document.getElementById('printTime').innerText = new Date().toLocaleString('th-TH');
  document.getElementById('printSignArea').style.display = 'flex';
  window.print();
  setTimeout(() => { document.getElementById('printSignArea').style.display = 'none'; }, 1000);
}

function exportExcel(tableId) {
  const table = document.getElementById(tableId);
  const wb = XLSX.utils.table_to_book(table, {sheet: "Sheet1"});
  XLSX.writeFile(wb, `${tableId}_${new Date().getTime()}.xlsx`);
}

function switchWarehouse(type) {
  currentWarehouse = type;
  document.getElementById('btn-MAIN').className = type === 'MAIN' ? 'btn btn-primary px-4' : 'btn btn-outline-primary px-4';
  document.getElementById('btn-SLIP').className = type === 'SLIP' ? 'btn btn-primary px-4' : 'btn btn-outline-primary px-4';
  document.getElementById('titleName').innerText = type === 'MAIN' ? 'เบิกพัสดุอุปกรณ์' : 'คลังม้วน Slip';
  initApp();
}

if(document.getElementById('withdrawForm')) {
    document.getElementById('withdrawForm').onsubmit = function(e) {
      e.preventDefault();
      
      // ดึงค่าวันที่ และเช็คความว่างเปล่าก่อนส่ง (ปรับปรุงให้ดึงค่าตรงๆ เพื่อความแม่นยำ)
      const withdrawDateVal = document.getElementById('withdrawDate').value;
      if (!withdrawDateVal || withdrawDateVal === "") {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกวันที่ก่อนบันทึก', 'warning');
        return;
      }

      showLoader(true);
      let valCarId = document.getElementById('carId').value;
      let valCarNum = (currentWarehouse === 'SLIP') ? valCarId : document.getElementById('carNum').value;
      
      const obj = {
        editingRowId: document.getElementById('editingRowId').value,
        withdrawDate: withdrawDateVal, // ยืนยันการส่งตัวแปรนี้
        carId: (currentWarehouse === 'SLIP') ? "-" : valCarId,
        carNum: valCarNum,
        itemId: document.getElementById('itemId').value,
        amount: document.getElementById('amount').value
      };
      
      google.script.run.withSuccessHandler(res => {
        Swal.fire({title: res, icon: res.includes('❌') ? 'error' : 'success', timer: 2000});
        cancelEditing();
        initApp();
        if(document.getElementById('report-pane').style.display !== 'none') loadReport();
      }).saveWithdrawal(obj, currentWarehouse);
    };
}

function editRow(rid, car, num, item, amt) {
  showPane('withdraw');
  document.getElementById('editingRowId').value = rid;
  if(currentWarehouse === 'MAIN') {
      document.getElementById('carId').value = car;
      document.getElementById('carNum').value = num;
  } else { document.getElementById('carId').value = num; }
  document.getElementById('itemId').value = item;
  document.getElementById('amount').value = amt;
  document.getElementById('submitBtn').innerText = "อัปเดตการแก้ไข";
  document.getElementById('cancelEditBtn').style.display = "block";
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function confirmReturn(rid, max) {
  Swal.fire({ title: 'คืนพัสดุ', input: 'number', inputAttributes: {min:1, max:max}, inputValue: max, showCancelButton:true }).then(res => {
    if(res.isConfirmed) {
      showLoader(true);
      google.script.run.withSuccessHandler(r => { 
        Swal.fire(r); 
        initApp(); 
        if(document.getElementById('report-pane').style.display !== 'none') loadReport();
      }).returnItem(rid, currentWarehouse, Number(res.value));
    }
  });
}

function deleteRow(rid) {
  Swal.fire({ title: 'ลบรายการ?', icon: 'warning', showCancelButton: true }).then(r => {
    if(r.isConfirmed) {
      showLoader(true);
      google.script.run.withSuccessHandler(res => { 
        initApp(); 
        Swal.fire(res); 
        if(document.getElementById('report-pane').style.display !== 'none') loadReport();
      }).handleTransaction(rid, currentWarehouse, 'DELETE');
    }
  });
}

function submitManage(mode) {
  const obj = { m_itemId: document.getElementById('m_itemId').value, m_itemName: document.getElementById('m_itemName').value, m_amount: document.getElementById('m_amount').value };
  showLoader(true);
  google.script.run.withSuccessHandler(res => { initApp(); Swal.fire(res); }).manageStock(obj, currentWarehouse, mode);
}

function showLoader(s) { document.getElementById('loader').style.display = s ? 'flex' : 'none'; }
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('show'); document.getElementById('overlay').classList.toggle('show'); }

function cancelEditing() { 
  document.getElementById('withdrawForm').reset(); 
  document.getElementById('editingRowId').value = ""; 
  document.getElementById('submitBtn').innerText = "บันทึกรายการเบิก"; 
  document.getElementById('cancelEditBtn').style.display = "none";
  
  // คืนค่าวันที่เบิกให้เป็นวันนี้หลัง Reset (ป้องกันช่องว่างที่ทำให้เกิด Error)
  const withdrawDateInput = document.getElementById('withdrawDate');
  if (withdrawDateInput) {
    withdrawDateInput.value = new Date().toISOString().split('T')[0];
  }
}

function fillManageForm(id, name) { document.getElementById('m_itemId').value = id; document.getElementById('m_itemName').value = name; }