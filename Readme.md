# CS4218 Project - Virtual Vault

This is the URL to the latest Workflow Run

https://github.com/cs4218/cs4218-2510-ecom-project-team018/actions/runs/18224388108/job/51891745709

This is the URL to our Team's CICD YML File

https://github.com/cs4218/cs4218-2510-ecom-project-team018/blob/main/.github/workflows/main.yml

## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## 2. Website Features

- **User Authentication**: Secure user authentication system implemented to manage user accounts and sessions.
- **Payment Gateway Integration**: Seamless integration with popular payment gateways for secure and reliable online transactions.
- **Search and Filters**: Advanced search functionality and filters to help users easily find products based on their preferences.
- **Product Set**: Organized product sets for efficient navigation and browsing through various categories and collections.

## 3. Your Task

- **Unit and Integration Testing**: Utilize Jest for writing and running tests to ensure individual components and functions work as expected, finding and fixing bugs in the process.
- **UI Testing**: Utilize Playwright for UI testing to validate the behavior and appearance of the website's user interface.
- **Code Analysis and Coverage**: Utilize SonarQube for static code analysis and coverage reports to maintain code quality and identify potential issues.
- **Load Testing**: Leverage JMeter for load testing to assess the performance and scalability of the ecommerce platform under various traffic conditions.

## 4. Setting Up The Project

### 1. Installing Node.js

1. **Download and Install Node.js**:

   - Visit [nodejs.org](https://nodejs.org) to download and install Node.js.

2. **Verify Installation**:
   - Open your terminal and check the installed versions of Node.js and npm:
     ```bash
     node -v
     npm -v
     ```

### 2. MongoDB Setup

1. **Download and Install MongoDB Compass**:

   - Visit [MongoDB Compass](https://www.mongodb.com/products/tools/compass) and download and install MongoDB Compass for your operating system.

2. **Create a New Cluster**:

   - Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
   - After logging in, create a project and within that project deploy a free cluster.

3. **Configure Database Access**:

   - Create a new user for your database (if not alredy done so) in MongoDB Atlas.
   - Navigate to "Database Access" under "Security" and create a new user with the appropriate permissions.

4. **Whitelist IP Address**:

   - Go to "Network Access" under "Security" and whitelist your IP address to allow access from your machine.
   - For example, you could whitelist 0.0.0.0 to allow access from anywhere for ease of use.

5. **Connect to the Database**:

   - In your cluster's page on MongoDB Atlas, click on "Connect" and choose "Compass".
   - Copy the connection string.

6. **Establish Connection with MongoDB Compass**:
   - Open MongoDB Compass on your local machine, paste the connection string (replace the necessary placeholders), and establish a connection to your cluster.

### 3. Application Setup

To download and use the MERN (MongoDB, Express.js, React.js, Node.js) app from GitHub, follow these general steps:

1. **Clone the Repository**

   - Go to the GitHub repository of the MERN app.
   - Click on the "Code" button and copy the URL of the repository.
   - Open your terminal or command prompt.
   - Use the `git clone` command followed by the repository URL to clone the repository to your local machine:
     ```bash
     git clone <repository_url>
     ```
   - Navigate into the cloned directory.

2. **Install Frontend and Backend Dependencies**

   - Run the following command in your project's root directory:

     ```
     npm install && cd client && npm install && cd ..
     ```

3. **Add database connection string to `.env`**

   - Add the connection string copied from MongoDB Atlas to the `.env` file inside the project directory (replace the necessary placeholders):
     ```env
     MONGO_URL = <connection string>
     ```

4. **Adding sample data to database**

   - Download “Sample DB Schema” from Canvas and extract it.
   - In MongoDB Compass, create a database named `test` under your cluster.
   - Add four collections to this database: `categories`, `orders`, `products`, and `users`.
   - Under each collection, click "ADD DATA" and import the respective JSON from the extracted "Sample DB Schema".

5. **Running the Application**
   - Open your web browser.
   - Use `npm run dev` to run the app from root directory, which starts the development server.
   - Navigate to `http://localhost:3000` to access the application.

## 5. Unit Testing with Jest

Unit testing is a crucial aspect of software development aimed at verifying the functionality of individual units or components of a software application. It involves isolating these units and subjecting them to various test scenarios to ensure their correctness.  
Jest is a popular JavaScript testing framework widely used for unit testing. It offers a simple and efficient way to write and execute tests in JavaScript projects.

### Getting Started with Jest

To begin unit testing with Jest in your project, follow these steps:

1. **Install Jest**:  
   Use your preferred package manager to install Jest. For instance, with npm:

   ```bash
   npm install --save-dev jest

   ```

2. **Write Tests**  
   Create test files for your components or units where you define test cases to evaluate their behaviour.

3. **Run Tests**  
   Execute your tests using Jest to ensure that your components meet the expected behaviour.  
   You can run the tests by using the following command in the root of the directory:

   - **Frontend tests**

     ```bash
     npm run test:frontend
     ```

   - **Backend tests**

     ```bash
     npm run test:backend
     ```

   - **Both frontend and backend tests**
     ```bash
     npm run test
     ```

   - **Integration tests**
      ```bash
      npm run test:integration
      ```

## 6. UI testing with Playwright
To begin UI testing with Playwright in your project, follow these steps:

1. **Run playwright tests**
   ```bash
   npm run test:playwright
   ```

## 7. Running all tests
To run frontend, backend, integration and playwright tests, use the command:
```bash
npm run test:all
```

## Milestone 1 Contributions

<table>
   <thead>
      <tr>
         <th>Member</th>
         <th>Feature</th>
         <th>Client Related Files (<code>/client/src/</code>)</th>
         <th>Server Related Files (<code>./</code>)</th>
      </tr>
   </thead>
   <tbody>
      <!-- Wei Rong -->
      <tr>
         <td rowspan="4"><strong>Chu Wei Rong</strong></td>
         <td><strong>Protected Routes</strong></td>
         <td>
            <ul>
               <li><code>context/auth.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li><code>helpers/authHelper.js</code></li>
               <li><code>middlewares/authMiddleware.js</code></li>
            </ul>
         </td>
      </tr>
      <tr>
         <td><strong>Registration</strong></td>
         <td>
            <ul>
               <li><code>pages/Auth/Register.js</code></li>
            </ul>
         </td>
         <td rowspan="2">
            <ul>
               <li>
                  <strong><code>controllers/authController.js</code></strong>
                  <ol>
                     <li><code>registerController</code></li>
                     <li><code>loginController</code></li>
                     <li><code>forgotPasswordController</code></li>
                     <li><code>testController</code></li>
                  </ol>
               </li>
            </ul>
         </td>
      </tr>
      <tr>
         <td><strong>Login</strong></td>
         <td>
            <ul>
               <li><code>pages/Auth/Login.js</code></li>
            </ul>
         </td>
      </tr>
      <tr>
         <td><strong>General</strong></td>
         <td>
            <ul>
               <li><code>components/Routes/Private.js</code></li>
               <li><code>components/UserMenu.js</code></li>
               <li><code>pages/user/Dashboard.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li><code>models/userModel.js</code></li>
            </ul>
         </td>
      </tr>
      <!-- Kenvyn -->
      <tr>
         <td rowspan="5"><strong>Kenvyn Kwek Shiu Chien</strong></td>
         <td><strong>Admin Dashboard</strong></td>
         <td>
            <ul>
               <li><code>components/AdminMenu.js</code></li>
               <li><code>pages/admin/AdminDashboard.js</code></li>
            </ul>
         </td>
         <td></td>
      </tr>
      <tr>
         <td><strong>Admin Actions</strong></td>
         <td>
            <ul>
               <li><code>components/Form/CategoryForm.js</code></li>
               <li><code>pages/admin/CreateCategory.js</code></li>
               <li><code>pages/admin/CreateProduct.js</code></li>
               <li><code>pages/admin/UpdateProduct.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li>
                  <strong><code>controllers/categoryController.js</code></strong>
                  <ol>
                     <li><code>createCategoryController</code></li>
                     <li><code>updateCategoryController</code></li>
                     <li><code>deleteCategoryController</code></li>
                  </ol>
               </li>
            </ul>
         </td>
      </tr>
      <tr>
         <td><strong>Admin View Orders</strong></td>
         <td>
            <ul>
               <li><code>pages/admin/AdminOrders.js</code></li>
            </ul>
         </td>
         <td></td>
      </tr>
      <tr>
         <td><strong>Admin View Products</strong></td>
         <td>
            <ul>
               <li><code>pages/admin/Products.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li>
                  <strong><code>controllers/productController.js</code></strong>
                  <ol>
                     <li><code>createProductController</code></li>
                     <li><code>deleteProductController</code></li>
                     <li><code>updateProductController</code></li>
                  </ol>
               </li>
            </ul>
         </td>
      </tr>
      <tr>
         <td><strong>Admin View Users</strong></td>
            <td>
               <ul>
                  <li><code>pages/admin/Users.js</code></li>
               </ul>
            </td>
         <td></td>
      </tr>
      <!-- Brendan -->
      <tr>
         <td rowspan="4"><strong>Brendan Soh Ray Yang</strong></td>
         <td><strong>Order</strong></td>
         <td>
            <ul>
               <li><code>pages/user/Orders.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li>
                  <strong><code>controllers/authController.js</code></strong>
                  <ol>
                     <li><code>updateProfileController</code></li>
                     <li><code>getOrdersController</code></li>
                     <li><code>getAllOrdersController</code></li>
                     <li><code>orderStatusController</code></li>
                  </ol>
               </li>
               <li><code>models/orderModel.js</code></li>
            </ul>
         </td>
      </tr>
      <tr>
         <td><strong>Profile</strong></td>
         <td>
            <ul>
               <li><code>pages/user/Profile.js</code></li>
            </ul>
         </td>
         <td></td>
      </tr>
      <tr>
         <td><strong>Search</strong></td>
         <td>
            <ul>
               <li><code>components/Form/SearchInput.js</code></li>
               <li><code>context/search.js</code></li>
               <li><code>pages/Search.js</code></li>
            </ul>
         </td>
         <td></td>
      </tr>
      <tr>
         <td><strong>Home</strong></td>
         <td>
            <ul>
               <li><code>pages/Homepage.js</code></li>
            </ul>
         </td>
         <td></td>
      </tr>
      <!-- Andre -->
      <tr>
         <td rowspan="3"><strong>Andre Chua Kai Jun</strong></td>
         <td><strong>Product</strong></td>
         <td>
            <ul>
               <li><code>pages/ProductDetails.js</code></li>
               <li><code>pages/CategoryProduct.js</code></li>
               <li><code>utils/ProductUtils.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li>
                  <strong><code>controllers/productController.js</code></strong>
                  <ol>
                     <li><code>getProductController</code></li>
                     <li><code>getSingleProductController</code></li>
                     <li><code>productPhotoController</code></li>
                     <li><code>productFiltersController</code></li>
                     <li><code>productCountController</code></li>
                     <li><code>productListController</code></li>
                     <li><code>searchProductController</code></li>
                     <li><code>relatedProductController</code></li>
                     <li><code>productCategoryController</code></li>
                     <li><code>productCategoryCountController</code></li>
                  </ol>
               </li>
               <li><code>models/productModel.js</code></li>
            </ul>
         </td>
      </tr>
      <tr>
         <td><strong>Contact</strong></td>
         <td>
            <ul>
               <li><code>pages/Contact.js</code></li>
            </ul>
         </td>
         <td></td>
      </tr>
      <tr>
         <td><strong>Policy</strong></td>
         <td>
            <ul>
               <li><code>pages/Policy.js</code></li>
            </ul>
         </td>
         <td></td>
      </tr>
      <!-- Kuei -->
      <tr>
         <td rowspan="4"><strong>Chen Kuei</strong></td>
         <td><strong>General</strong></td>
         <td>
            <ul>
               <li><code>components/Footer.js</code></li>
               <li><code>components/Header.js</code></li>
               <li><code>components/Layout.js</code></li>
               <li><code>components/Spinner.js</code></li>
               <li><code>pages/About.js</code></li>
               <li><code>pages/Pagenotfound.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li><code>config/db.js</code></li>
            </ul>
         </td>
      </tr>
      <tr>
         <td><strong>Cart</strong></td>
         <td>
            <ul>
               <li><code>context/cart.js</code></li>
               <li><code>pages/CartPage.js</code></li>
            </ul>
         </td>
         <td></td>
      </tr>
      <tr>
         <td><strong>Category</strong></td>
         <td>
            <ul>
               <li><code>hooks/useCategory.js</code></li>
               <li><code>pages/Categories.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li>
                  <strong><code>controllers/categoryController.js</code></strong>
                  <ol>
                     <li><code>categoryController</code></li>
                     <li><code>singleCategoryController</code></li>
                  </ol>
               </li>
               <li><code>models/categoryModel.js</code></li>
            </ul>
         </td>
      </tr>
      <tr>
         <td><strong>Payment</strong></td>
         <td>
         </td>
         <td>
            <ul>
               <li>
                  <strong><code>controllers/productController.js</code></strong>
                  <ol>
                     <li><code>braintreeTokenController</code></li>
                     <li><code>brainTreePaymentController</code></li>
                  </ol>
               </li>
            </ul>
         </td>
      </tr>
   </tbody>
</table>

## Milestone 2 Contributions

<table>
   <thead>
      <tr>
         <th>Member</th>
         <th>Integration testing files</th>
         <th>UI testing files</th>
      </tr>
   </thead>
   <tbody>
      <tr>
         <td>Chu Wei Rong</td>
         <td>
            <ul>
               <li><code>./client/src/components/Routes/Private.it.test.js</code></li>
               <li><code>./client/src/pages/Auth/Login.it.test.js</code></li>
               <li><code>./client/src/pages/Auth/Register.it.test.js</code></li>
               <li><code>./client/src/pages/admin/AdminOrders.it.test.js</code></li>
               <li><code>./client/src/pages/admin/Users.it.test.js</code></li>
               <li><code>./client/src/pages/user/Dashboard.it.test.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li><code></code></li>
            </ul>
         </td>
      </tr>
      <tr>
         <td>Kenvyn Kwek Shiu Chien</td>
         <td>
            <ul>
               <li><code>./client/src/pages/admin/CreateCategory.it.test.js</code></li>
               <li><code>./client/src/pages/admin/CreateProduct.it.test.js</code></li>
               <li><code>./client/src/pages/admin/UpdateProduct.it.test.js</code></li>
               <li><code>./client/src/pages/admin/Products.it.test.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li><code>./client/src/pages/admin/CreateProduct.spec.js</code></li>
               <li><code>./client/src/pages/admin/UpdateProduct.spec.js</code></li>
            </ul>
         </td>
      </tr>
      <tr>
         <td>Brendan Soh Ray Yang</td>
         <td>
            <ul>
               <li><code>./controllers/authController.it.test.js</code></li>
               <li><code>./client/src/components/Form/SearchInput.it.test.js</code></li>
               <li><code>./client/src/pages/user/Profile.it.test.js</code></li>
               <li><code>./client/src/pages/user/Orders.it.test.js</code></li>
               <li><code>./client/src/pages/Search.it.test.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li><code>./client/src/pages/Search.spec.js</code></li>
               <li><code>./client/src/pages/HomePage.spec.js</code></li>
               <li><code>./client/src/pages/admin/CreateCategory.spec.js</code></li>
               <li><code>./client/src/pages/user/Profile.spec.js</code></li>
            </ul>
         </td>
      </tr>
      <tr>
         <td>Andre Chua Kai Jun</td>
         <td>
            <ul>
               <li><code>./client/src/pages/CategoryProduct.it.test.js</code></li>
               <li><code>./client/src/pages/ProductDetails.it.test.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li><code>./client/src/pages/CategoryProduct.spec.js</code></li>
               <li><code>./client/src/pages/admin/Users.spec.js</code></li>
               <li><code>./client/src/pages/Contact.spec.js</code></li>
               <li><code>./client/src/pages/Policy.spec.js</code></li>
               <li><code>./client/src/pages/ProductDetails.spec.js</code></li>
            </ul>
         </td>
      </tr>
      <tr>
         <td>Chen Kuei</td>
         <td>
            <ul>
               <li><code>./client/src/pages/Categories.it.test.js</code></li>
               <li><code>./client/src/pages/CartPage.it.test.js</code></li>
            </ul>
         </td>
         <td>
            <ul>
               <li><code>./client/src/pages/admin/Products.spec.js</code></li>
               <li><code>./client/src/pages/Categories.spec.js</code></li>
               <li><code>./client/src/pages/CartPage.spec.js</code></li>
            </ul>
         </td>
      </tr>
   </tbody>
</table>
