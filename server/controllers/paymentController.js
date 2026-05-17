import crypto from 'crypto';
import pool from '../config/db.js';

const getRazorpayAuthHeader = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
};

export const createOrder = async (req, res) => {
  const { courseId } = req.body;
  const userId = req.user.id;

  if (!courseId) {
    return res.status(400).json({ message: 'Course ID is required' });
  }

  try {
    const courseResult = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
    const course = courseResult.rows[0];

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const existingAccess = await pool.query(
      'SELECT 1 FROM user_courses WHERE user_id = $1 AND course_id = $2',
      [userId, courseId]
    );

    if (existingAccess.rows.length > 0) {
      return res.status(400).json({ message: 'Course already purchased' });
    }

    const authHeader = getRazorpayAuthHeader();
    if (!authHeader) {
      return res.status(500).json({ message: 'Razorpay credentials are not configured' });
    }

    const amountInPaise = Math.round(Number(course.price) * 100);
    const receipt = `course_${courseId}_user_${userId}_${Date.now()}`;

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        notes: {
          courseId: String(courseId),
          userId: String(userId),
          courseTitle: course.title,
        },
      }),
    });

    const razorpayOrder = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error('Razorpay Order Error:', razorpayOrder);
      return res.status(500).json({
        message: 'Failed to create Razorpay order',
        error: razorpayOrder?.error?.description || razorpayOrder,
      });
    }

    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, course_id, gateway, gateway_order_id, amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, courseId, 'razorpay', razorpayOrder.id, course.price, razorpayOrder.currency, 'created']
    );

    res.status(201).json({
      orderId: orderResult.rows[0].id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating payment order', error: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  const { orderId, razorpay_order_id: razorpayOrderId, razorpay_payment_id: razorpayPaymentId, razorpay_signature: razorpaySignature } = req.body;
  const userId = req.user.id;

  if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: 'Missing payment verification fields' });
  }

  try {
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, userId]
    );

    const order = orderResult.rows[0];

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      await pool.query(
        'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['failed', orderId]
      );

      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    await pool.query('BEGIN');

    await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['paid', orderId]
    );

    await pool.query(
      `INSERT INTO payments (order_id, user_id, course_id, gateway, gateway_payment_id, gateway_signature, amount, currency, status, paid_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (gateway_payment_id) DO NOTHING`,
      [order.id, userId, order.course_id, 'razorpay', razorpayPaymentId, razorpaySignature, order.amount, order.currency, 'paid']
    );

    await pool.query(
      `INSERT INTO user_courses (user_id, course_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, course_id) DO NOTHING`,
      [userId, order.course_id]
    );

    await pool.query('COMMIT');

    res.json({ message: 'Payment verified and course unlocked successfully' });
  } catch (error) {
    await pool.query('ROLLBACK');
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
};
