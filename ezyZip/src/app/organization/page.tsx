"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import Badge from "@/components/Badge";
import { Plus } from "lucide-react";

export default function OrganizationPage() {
  const [activeTab, setActiveTab] = useState("departments");
  
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const fetchData = async () => {
    try {
      const [deptRes, catRes, empRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/categories"),
        fetch("/api/employees")
      ]);
      setDepartments(await deptRes.json());
      setCategories(await catRes.json());
      setEmployees(await empRes.json());
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openDeptModal = (dept: any = null) => {
    setSelectedItem(dept);
    setIsDeptModalOpen(true);
  };

  const openCatModal = (cat: any = null) => {
    setSelectedItem(cat);
    setIsCatModalOpen(true);
  };

  const openEmpModal = (emp: any = null) => {
    setSelectedItem(emp);
    setIsEmpModalOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Organization Setup</h1>
          <p className="text-[var(--text-secondary)]">Manage departments, asset categories, and employee roles.</p>
        </div>
        <div className="flex gap-3">
          {activeTab === "departments" && (
            <button onClick={() => openDeptModal()} className="btn btn-primary">
              <Plus size={16} className="mr-2" /> Add Department
            </button>
          )}
          {activeTab === "categories" && (
            <button onClick={() => openCatModal()} className="btn btn-primary">
              <Plus size={16} className="mr-2" /> Add Category
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--elevated)] border border-[var(--border)] rounded-lg mb-6 w-max">
        {["departments", "categories", "employees"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab 
                ? "bg-[var(--card)] text-white shadow" 
                : "text-[var(--text-secondary)] hover:text-white"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === "departments" && (
          <DataTable
            data={departments}
            keyExtractor={(item) => item._id}
            onRowClick={openDeptModal}
            columns={[
              { header: "Department", accessor: "name" },
              { header: "Head", accessor: "head", render: (item) => item.head?.name || "-" },
              { header: "Parent Dept", accessor: "parentDepartment", render: (item) => item.parentDepartment?.name || "-" },
              { header: "Status", accessor: "status", render: (item) => (
                <Badge variant={item.status === "Active" ? "success" : "neutral"}>{item.status}</Badge>
              )}
            ]}
          />
        )}
        
        {activeTab === "categories" && (
          <DataTable
            data={categories}
            keyExtractor={(item) => item._id}
            onRowClick={openCatModal}
            columns={[
              { header: "Category", accessor: "name" },
              { header: "Description", accessor: "description", render: (item) => item.description || "-" },
            ]}
          />
        )}

        {activeTab === "employees" && (
          <DataTable
            data={employees}
            keyExtractor={(item) => item._id}
            onRowClick={openEmpModal}
            columns={[
              { header: "Name", accessor: "name" },
              { header: "Email", accessor: "email" },
              { header: "Department", accessor: "department", render: (item) => item.department?.name || "-" },
              { header: "Role", accessor: "role", render: (item) => {
                let variant: any = "neutral";
                if (item.role === "Admin") variant = "danger";
                else if (item.role === "AssetManager") variant = "primary";
                else if (item.role === "DepartmentHead") variant = "warning";
                return <Badge variant={variant}>{item.role}</Badge>;
              }},
              { header: "Status", accessor: "status", render: (item) => (
                <Badge variant={item.status === "Active" ? "success" : "neutral"}>{item.status}</Badge>
              )}
            ]}
          />
        )}
      </div>

      {/* Modals */}
      <DepartmentModal 
        isOpen={isDeptModalOpen} 
        onClose={() => setIsDeptModalOpen(false)} 
        dept={selectedItem} 
        users={employees} 
        departments={departments}
        onSave={fetchData} 
      />
      <CategoryModal 
        isOpen={isCatModalOpen} 
        onClose={() => setIsCatModalOpen(false)} 
        category={selectedItem} 
        onSave={fetchData} 
      />
      <EmployeeModal 
        isOpen={isEmpModalOpen} 
        onClose={() => setIsEmpModalOpen(false)} 
        employee={selectedItem} 
        departments={departments}
        onSave={fetchData} 
      />
    </DashboardLayout>
  );
}

// ---- Subcomponents for Modals ----

function DepartmentModal({ isOpen, onClose, dept, users, departments, onSave }: any) {
  const [name, setName] = useState("");
  const [head, setHead] = useState("");
  const [parentDepartment, setParentDepartment] = useState("");
  const [status, setStatus] = useState("Active");

  useEffect(() => {
    if (dept) {
      setName(dept.name || "");
      setHead(dept.head?._id || "");
      setParentDepartment(dept.parentDepartment?._id || "");
      setStatus(dept.status || "Active");
    } else {
      setName(""); setHead(""); setParentDepartment(""); setStatus("Active");
    }
  }, [dept, isOpen]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const payload = { name, head, parentDepartment, status };
    if (dept?._id) (payload as any)._id = dept._id;

    await fetch("/api/departments", {
      method: dept ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={dept ? "Edit Department" : "Add Department"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input-field" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Department Head</label>
          <select value={head} onChange={e => setHead(e.target.value)} className="input-field">
            <option value="">None</option>
            {users.map((u: any) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Parent Department</label>
          <select value={parentDepartment} onChange={e => setParentDepartment(e.target.value)} className="input-field">
            <option value="">None</option>
            {departments.filter((d: any) => d._id !== dept?._id).map((d: any) => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="input-field">
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} className="btn bg-[var(--card)] border border-[var(--border)]">Cancel</button>
          <button type="submit" className="btn btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryModal({ isOpen, onClose, category, onSave }: any) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (category) {
      setName(category.name || "");
      setDescription(category.description || "");
    } else {
      setName(""); setDescription("");
    }
  }, [category, isOpen]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const payload = { name, description };
    if (category?._id) (payload as any)._id = category._id;

    await fetch("/api/categories", {
      method: category ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? "Edit Category" : "Add Category"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input-field" />
        </div>
        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="input-field" rows={3} />
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} className="btn bg-[var(--card)] border border-[var(--border)]">Cancel</button>
          <button type="submit" className="btn btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}

function EmployeeModal({ isOpen, onClose, employee, departments, onSave }: any) {
  const [role, setRole] = useState("Employee");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("Active");

  useEffect(() => {
    if (employee) {
      setRole(employee.role || "Employee");
      setDepartment(employee.department?._id || "");
      setStatus(employee.status || "Active");
    }
  }, [employee, isOpen]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!employee) return;
    
    await fetch("/api/employees", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: employee._id, role, department, status })
    });
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Employee Role">
      {employee && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="p-3 bg-[var(--elevated)] rounded-lg mb-2">
            <p className="font-medium text-white">{employee.name}</p>
            <p className="text-sm text-[var(--text-secondary)]">{employee.email}</p>
          </div>
          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="input-field">
              <option value="Employee">Employee</option>
              <option value="DepartmentHead">Department Head</option>
              <option value="AssetManager">Asset Manager</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Department</label>
            <select value={department} onChange={e => setDepartment(e.target.value)} className="input-field">
              <option value="">None</option>
              {departments.map((d: any) => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-field">
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onClose} className="btn bg-[var(--card)] border border-[var(--border)]">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
