const express = require('express');
const controller = require('../controllers/laundryController');
const router = express.Router();

router.get('/customers', controller.listCustomers);
router.get('/customers/:id', controller.getCustomer);
router.post('/customers', controller.createCustomer);
router.put('/customers/:id', controller.updateCustomer);
router.delete('/customers/:id', controller.removeCustomer);

router.get('/services', controller.listServices);
router.get('/services/:id', controller.getService);
router.post('/services', controller.createService);
router.put('/services/:id', controller.updateService);
router.delete('/services/:id', controller.removeService);

router.get('/orders', controller.listOrders);
router.get('/orders/:id', controller.getOrder);
router.post('/orders', controller.createOrder);
router.put('/orders/:id', controller.updateOrder);
router.delete('/orders/:id', controller.removeOrder);

module.exports = router;