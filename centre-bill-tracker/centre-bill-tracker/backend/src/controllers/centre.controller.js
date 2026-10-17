const centreModel = require('../models/centre.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

function toApiShape(centre) {
  return {
    id: centre.id,
    centreName: centre.centre_name,
    vendorName: centre.vendor_name,
    wifiId: centre.wifi_id,
    accountNumber: centre.account_number,
    serviceType: centre.service_type,
    contractExpiryDate: centre.contract_expiry_date
      ? String(centre.contract_expiry_date).slice(0, 10)
      : null,
    status: centre.status,
    billCount: Number(centre.bill_count),
    createdAt: centre.created_at,
    updatedAt: centre.updated_at,
  };
}

/**
 * GET /api/centres?search=&status=
 * Admin + Operations. Search is by centre name only (SRD section 8).
 */
const listCentres = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const centres = await centreModel.findAll({ search, status });
  return new ApiResponse(200, { centres: centres.map(toApiShape) }).send(res);
});

/**
 * POST /api/centres
 * Admin only. Account number must be unique if provided (WiFi ID may be blank).
 */
const createCentre = asyncHandler(async (req, res) => {
  const { centreName, vendorName, wifiId, accountNumber, serviceType, contractExpiryDate } = req.body;

  if (serviceType && !['Firewall', 'Leased Line', 'Broadband', 'Managed Service'].includes(serviceType)) {
    throw ApiError.badRequest('Invalid service type.');
  }
  if (contractExpiryDate && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(contractExpiryDate)) {
    throw ApiError.badRequest('Contract expiry date must use YYYY-MM-DD format.');
  }

  if (accountNumber) {
    const existing = await centreModel.findByAccountNumber(accountNumber);
    if (existing) {
      throw ApiError.conflict('A centre with this account number already exists.');
    }
  }

  const centre = await centreModel.create({ centreName, vendorName, wifiId, accountNumber, serviceType, contractExpiryDate });
  return new ApiResponse(201, { centre: toApiShape(centre) }, 'Centre created successfully').send(res);
});

/**
 * PUT /api/centres/:id
 * Admin only.
 */
const updateCentre = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { centreName, vendorName, wifiId, accountNumber, serviceType, contractExpiryDate } = req.body;

  const existingCentre = await centreModel.findById(id);
  if (!existingCentre) {
    throw ApiError.notFound('Centre not found.');
  }

  if (serviceType && !['Firewall', 'Leased Line', 'Broadband', 'Managed Service'].includes(serviceType)) {
    throw ApiError.badRequest('Invalid service type.');
  }
  if (contractExpiryDate && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(contractExpiryDate)) {
    throw ApiError.badRequest('Contract expiry date must use YYYY-MM-DD format.');
  }

  if (accountNumber) {
    const duplicate = await centreModel.findByAccountNumber(accountNumber, id);
    if (duplicate) {
      throw ApiError.conflict('A centre with this account number already exists.');
    }
  }

  const updated = await centreModel.update(id, { centreName, vendorName, wifiId, accountNumber, serviceType, contractExpiryDate });
  return new ApiResponse(200, { centre: toApiShape(updated) }, 'Centre updated successfully').send(res);
});

/**
 * PATCH /api/centres/:id/status
 * Admin only. Toggles a centre between Active and Inactive.
 */
const updateCentreStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const existingCentre = await centreModel.findById(id);
  if (!existingCentre) {
    throw ApiError.notFound('Centre not found.');
  }

  const updated = await centreModel.updateStatus(id, status);
  return new ApiResponse(200, { centre: toApiShape(updated) }, `Centre marked as ${status}`).send(res);
});

/**
 * DELETE /api/centres/:id
 * Admin only. Hard delete is allowed only when the centre has zero bills;
 * otherwise the caller must deactivate the centre instead (approved rule).
 */
const deleteCentre = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingCentre = await centreModel.findById(id);
  if (!existingCentre) {
    throw ApiError.notFound('Centre not found.');
  }

  const billCount = await centreModel.countBills(id);
  if (billCount > 0) {
    throw ApiError.conflict(
      `This centre has ${billCount} bill(s) linked to it and cannot be deleted. Set its status to Inactive instead.`,
    );
  }

  await centreModel.remove(id);
  return new ApiResponse(200, null, 'Centre deleted successfully').send(res);
});

module.exports = { listCentres, createCentre, updateCentre, updateCentreStatus, deleteCentre };
