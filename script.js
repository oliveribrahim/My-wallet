// فئة المحفظة - Wallet Class
class Wallet {
    // الحقول الخاصة
    #balance = 0;
    #transactions = [];

    constructor() {
        // تحميل البيانات من localStorage عند إنشاء المحفظة
        this.loadFromLocalStorage();
    }

    // إضافة المال
    addMoney(amount, note) {
        if (amount <= 0) {
            throw new Error("المبلغ يجب أن يكون أكبر من صفر");
        }
        
        const transaction = {
            type: "إيداع",
            amount: amount,
            note: note,
            date: new Date().toLocaleString('ar-SA')
        };

        this.#balance += amount;
        this.#transactions.push(transaction);
        this.saveToLocalStorage();
        return transaction;
    }

    // صرف المال
    spendMoney(amount, note) {
        if (amount <= 0) {
            throw new Error("المبلغ يجب أن يكون أكبر من صفر");
        }

        if (amount > this.#balance) {
            throw new Error("الرصيد غير كافي");
        }

        const transaction = {
            type: "صرف",
            amount: amount,
            note: note,
            date: new Date().toLocaleString('ar-SA')
        };

        this.#balance -= amount;
        this.#transactions.push(transaction);
        this.saveToLocalStorage();
        return transaction;
    }

    // الحصول على الرصيد الحالي
    getBalance() {
        return this.#balance;
    }

    // تعيين الرصيد الأولي أو تعديله
    setBalance(amount) {
        if (amount < 0) {
            throw new Error("الرصيد لا يمكن أن يكون سالباً");
        }
        this.#balance = amount;
        this.saveToLocalStorage();
    }

    // عرض سجل المعاملات
    showHistory() {
        return [...this.#transactions]; // إرجاع نسخة من المصفوفة
    }

    // حذف معاملة
    deleteTransaction(index) {
        if (index < 0 || index >= this.#transactions.length) {
            throw new Error("رقم المعاملة غير صحيح");
        }

        const transaction = this.#transactions[index];
        
        // عكس تأثير المعاملة على الرصيد
        if (transaction.type === "إيداع") {
            this.#balance -= transaction.amount;
        } else {
            this.#balance += transaction.amount;
        }

        // حذف المعاملة من المصفوفة
        this.#transactions.splice(index, 1);
        this.saveToLocalStorage();
        return transaction;
    }

    // تعديل معاملة
    editTransaction(index, newAmount, newNote, newType) {
        if (index < 0 || index >= this.#transactions.length) {
            throw new Error("رقم المعاملة غير صحيح");
        }

        if (newAmount <= 0) {
            throw new Error("المبلغ يجب أن يكون أكبر من صفر");
        }

        const oldTransaction = this.#transactions[index];
        
        // عكس تأثير المعاملة القديمة على الرصيد
        if (oldTransaction.type === "إيداع") {
            this.#balance -= oldTransaction.amount;
        } else {
            this.#balance += oldTransaction.amount;
        }

        // التحقق من الرصيد عند التعديل إلى صرف
        if (newType === "صرف" && newAmount > this.#balance) {
            // إعادة الرصيد كما كان
            if (oldTransaction.type === "إيداع") {
                this.#balance += oldTransaction.amount;
            } else {
                this.#balance -= oldTransaction.amount;
            }
            throw new Error("الرصيد غير كافي لهذه العملية");
        }

        // تحديث المعاملة
        this.#transactions[index] = {
            type: newType,
            amount: newAmount,
            note: newNote,
            date: oldTransaction.date // الحفاظ على التاريخ الأصلي
        };

        // إضافة تأثير المعاملة الجديدة على الرصيد
        if (newType === "إيداع") {
            this.#balance += newAmount;
        } else {
            this.#balance -= newAmount;
        }

        this.saveToLocalStorage();
        return this.#transactions[index];
    }

    // الحصول على معاملة بواسطة الفهرس
    getTransaction(index) {
        if (index < 0 || index >= this.#transactions.length) {
            throw new Error("رقم المعاملة غير صحيح");
        }
        return { ...this.#transactions[index] }; // إرجاع نسخة
    }

    // حفظ البيانات في localStorage
    saveToLocalStorage() {
        const data = {
            balance: this.#balance,
            transactions: this.#transactions
        };
        localStorage.setItem('walletData', JSON.stringify(data));
    }

    // تحميل البيانات من localStorage
    loadFromLocalStorage() {
        const savedData = localStorage.getItem('walletData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.#balance = data.balance || 0;
                this.#transactions = data.transactions || [];
            } catch (error) {
                console.error('خطأ في تحميل البيانات:', error);
                this.#balance = 0;
                this.#transactions = [];
            }
        }
    }
}

// إدارة واجهة المستخدم - UI Manager Class
class WalletUI {
    constructor(wallet) {
        this.wallet = wallet;
        this.initializeElements();
        this.attachEventListeners();
        this.updateBalance();
    }

    // تهيئة عناصر DOM
    initializeElements() {
        this.balanceDisplay = document.getElementById('balanceDisplay');
        this.transactionForm = document.getElementById('transactionForm');
        this.initialBalanceForm = document.getElementById('initialBalanceForm');
        this.initialBalanceInput = document.getElementById('initialBalance');
        this.amountInput = document.getElementById('amount');
        this.noteInput = document.getElementById('note');
        this.typeRadios = document.querySelectorAll('input[name="type"]');
        this.showBalanceBtn = document.getElementById('showBalanceBtn');
        this.showHistoryBtn = document.getElementById('showHistoryBtn');
        this.historySection = document.getElementById('historySection');
        this.historyDisplay = document.getElementById('historyDisplay');
        
        // إنشاء نافذة التعديل
        this.createEditModal();
        this.editingIndex = null;
    }

    // ربط أحداث العناصر
    attachEventListeners() {
        // إرسال نموذج الرصيد الأولي
        this.initialBalanceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleInitialBalance();
        });

        // إرسال نموذج المعاملة
        this.transactionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransaction();
        });

        // زر عرض الرصيد
        this.showBalanceBtn.addEventListener('click', () => {
            this.updateBalance();
            this.showAlert('تم تحديث الرصيد', 'success');
        });

        // زر عرض السجل
        this.showHistoryBtn.addEventListener('click', () => {
            this.showHistory();
        });
    }

    // معالجة تعيين الرصيد الأولي
    handleInitialBalance() {
        const amount = parseFloat(this.initialBalanceInput.value);
        
        if (isNaN(amount) || amount < 0) {
            this.showAlert('يرجى إدخال مبلغ صحيح', 'error');
            return;
        }

        try {
            this.wallet.setBalance(amount);
            this.showAlert(`تم تعيين الرصيد إلى ${amount.toFixed(2)} ر.س`, 'success');
            this.updateBalance();
            this.initialBalanceInput.value = '';
        } catch (error) {
            this.showAlert(error.message, 'error');
        }
    }

    // معالجة العملية الجديدة
    handleTransaction() {
        const amount = parseFloat(this.amountInput.value);
        const note = this.noteInput.value.trim();
        const type = document.querySelector('input[name="type"]:checked').value;

        // التحقق من صحة المدخلات
        if (!amount || amount <= 0) {
            this.showAlert('يرجى إدخال مبلغ صحيح', 'error');
            return;
        }

        if (!note) {
            this.showAlert('يرجى إدخال ملاحظة', 'error');
            return;
        }

        try {
            if (type === 'إيداع') {
                this.wallet.addMoney(amount, note);
                this.showAlert(`تم إضافة ${amount} ر.س بنجاح`, 'success');
            } else {
                this.wallet.spendMoney(amount, note);
                this.showAlert(`تم صرف ${amount} ر.س بنجاح`, 'warning');
            }

            // تحديث العرض وإعادة تعيين النموذج
            this.updateBalance();
            this.updateHistory();
            this.transactionForm.reset();
            
            // إعادة تحديد زر الإيداع كافتراضي
            this.typeRadios[0].checked = true;
        } catch (error) {
            this.showAlert(error.message, 'error');
        }
    }

    // تحديث عرض الرصيد
    updateBalance() {
        const balance = this.wallet.getBalance();
        const balanceAmount = this.balanceDisplay.querySelector('.balance-amount');
        balanceAmount.textContent = balance.toFixed(2);
    }

    // عرض السجل
    showHistory() {
        this.updateHistory();
        this.historySection.style.display = 'block';
        
        // تمرير سلس إلى القسم
        this.historySection.scrollIntoView({ behavior: 'smooth' });
    }

    // تحديث عرض السجل
    updateHistory() {
        const transactions = this.wallet.showHistory();
        
        if (transactions.length === 0) {
            this.historyDisplay.innerHTML = '<div class="empty-history">لا توجد معاملات حتى الآن</div>';
            return;
        }

        // عرض المعاملات بترتيب عكسي (الأحدث أولاً)
        // نحتاج لحساب الفهرس الصحيح لأننا نعرض بالعكس
        this.historyDisplay.innerHTML = transactions
            .slice()
            .reverse()
            .map((transaction, reversedIndex) => {
                // حساب الفهرس الأصلي في المصفوفة
                const originalIndex = transactions.length - 1 - reversedIndex;
                
                const isDeposit = transaction.type === 'إيداع';
                const itemClass = isDeposit ? 'deposit' : 'spend';
                const typeClass = isDeposit ? 'deposit' : 'spend';
                const amountClass = isDeposit ? 'deposit' : 'spend';
                const amountPrefix = isDeposit ? '+' : '-';

                return `
                    <div class="transaction-item ${itemClass}" data-index="${originalIndex}">
                        <div class="transaction-info">
                            <div class="transaction-type ${typeClass}">${transaction.type}</div>
                            <div class="transaction-note">${transaction.note}</div>
                            <div class="transaction-date">${transaction.date}</div>
                        </div>
                        <div class="transaction-details">
                            <div class="transaction-amount ${amountClass}">
                                ${amountPrefix}${transaction.amount.toFixed(2)} ر.س
                            </div>
                            <div class="transaction-actions">
                                <button class="btn-edit" onclick="walletUI.handleEdit(${originalIndex})" title="تعديل">
                                    ✏️
                                </button>
                                <button class="btn-delete" onclick="walletUI.handleDelete(${originalIndex})" title="حذف">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            })
            .join('');
    }

    // معالجة حذف معاملة
    handleDelete(index) {
        if (confirm('هل أنت متأكد من حذف هذه المعاملة؟')) {
            try {
                this.wallet.deleteTransaction(index);
                this.showAlert('تم حذف المعاملة بنجاح', 'success');
                this.updateBalance();
                this.updateHistory();
            } catch (error) {
                this.showAlert(error.message, 'error');
            }
        }
    }

    // معالجة تعديل معاملة
    handleEdit(index) {
        try {
            const transaction = this.wallet.getTransaction(index);
            this.editingIndex = index;
            
            // ملء نموذج التعديل
            document.getElementById('editAmount').value = transaction.amount;
            document.getElementById('editNote').value = transaction.note;
            
            // تحديد نوع العملية
            if (transaction.type === 'إيداع') {
                document.getElementById('editTypeDeposit').checked = true;
            } else {
                document.getElementById('editTypeSpend').checked = true;
            }
            
            // عرض نافذة التعديل
            document.getElementById('editModal').style.display = 'flex';
        } catch (error) {
            this.showAlert(error.message, 'error');
        }
    }

    // حفظ التعديل
    saveEdit() {
        const amount = parseFloat(document.getElementById('editAmount').value);
        const note = document.getElementById('editNote').value.trim();
        const type = document.querySelector('input[name="editType"]:checked').value;

        // التحقق من صحة المدخلات
        if (!amount || amount <= 0) {
            this.showAlert('يرجى إدخال مبلغ صحيح', 'error');
            return;
        }

        if (!note) {
            this.showAlert('يرجى إدخال ملاحظة', 'error');
            return;
        }

        try {
            this.wallet.editTransaction(this.editingIndex, amount, note, type);
            this.showAlert('تم تعديل المعاملة بنجاح', 'success');
            this.updateBalance();
            this.updateHistory();
            this.closeEditModal();
        } catch (error) {
            this.showAlert(error.message, 'error');
        }
    }

    // إغلاق نافذة التعديل
    closeEditModal() {
        document.getElementById('editModal').style.display = 'none';
        this.editingIndex = null;
    }

    // إنشاء نافذة التعديل
    createEditModal() {
        const modal = document.createElement('div');
        modal.id = 'editModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>تعديل المعاملة</h2>
                    <button class="modal-close" onclick="walletUI.closeEditModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="editAmount">المبلغ:</label>
                        <input type="number" id="editAmount" min="0" step="0.01" required placeholder="أدخل المبلغ">
                    </div>
                    <div class="form-group">
                        <label for="editNote">الملاحظة:</label>
                        <input type="text" id="editNote" required placeholder="مثال: مرتب، أكل، مواصلات">
                    </div>
                    <div class="form-group">
                        <label>نوع العملية:</label>
                        <div class="radio-group">
                            <label class="radio-label">
                                <input type="radio" name="editType" value="إيداع" id="editTypeDeposit">
                                <span>إيداع</span>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="editType" value="صرف" id="editTypeSpend">
                                <span>صرف</span>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="walletUI.saveEdit()">حفظ التعديل</button>
                    <button class="btn btn-secondary" onclick="walletUI.closeEditModal()">إلغاء</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // إغلاق النافذة عند النقر خارجها
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeEditModal();
            }
        });
    }

    // عرض رسالة تنبيه
    showAlert(message, type = 'success') {
        // إزالة أي رسائل سابقة
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // إنشاء رسالة جديدة
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        // إدراج الرسالة بعد العنوان في النموذج
        const form = document.querySelector('.transaction-form');
        form.insertBefore(alert, form.querySelector('form'));

        // إزالة الرسالة تلقائياً بعد 3 ثوان
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }
}

// تهيئة التطبيق عند تحميل الصفحة
let walletUI; // جعل walletUI متاحاً عالمياً للاستخدام في onclick handlers

document.addEventListener('DOMContentLoaded', () => {
    // إنشاء محفظة جديدة
    const wallet = new Wallet();
    
    // إنشاء واجهة المستخدم وربطها بالمحفظة
    walletUI = new WalletUI(wallet);
    
    // عرض السجل إذا كان هناك معاملات سابقة
    const transactions = wallet.showHistory();
    if (transactions.length > 0) {
        walletUI.updateHistory();
    }
});

